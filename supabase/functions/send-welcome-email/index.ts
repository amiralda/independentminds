// Trigger: DB triggers via pg_net (public.enqueue_welcome_email) when a person
// becomes a parent (confirmed signup), a Manager (request approved) or a
// Co-Guardian (invite accepted). Never called from the browser.
// Auth: x-cron-secret header (CRON_SECRET; the DB reads it from Vault 'cron_secret').
// Body: { user_id, trigger }
// Once per person: public.welcome_email_claim() inserts the welcome_email_sends
// row atomically; a second trigger (other role, retry, duplicate event) finds
// it and sends nothing. Only a previous 'failed' attempt can be retried.
// Respects suppressed_emails (status 'suppressed', nothing sent).
// Content: public.welcome_emails (independent copy of welcome-2026-10) in the
// person's profile language, EN fallback. Template + sender + unsubscribe
// link/headers: ../_shared/newsletter-email.ts (token campaign 'welcome').
// Side effects: Resend email, welcome_email_sends, messages_log,
// email_unsubscribe_tokens.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { listUnsubscribeHeaders, renderNewsletterEmail, unsubscribePageUrl } from "../_shared/newsletter-email.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const TRIGGERS = new Set(["parent_signup", "manager_approved", "co_guardian_accepted"]);
const TOKEN_CAMPAIGN = "welcome";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== Deno.env.get("CRON_SECRET")) return json({ error: "Unauthorized" }, 401);

  let body: { user_id?: string; trigger?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const userId = String(body.user_id ?? "");
  const trigger = String(body.trigger ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !TRIGGERS.has(trigger)) return json({ error: "Invalid input" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const setRow = (fields: Record<string, unknown>) =>
    db.from("welcome_email_sends").update({ ...fields, updated_at: new Date().toISOString() }).eq("user_id", userId);

  try {
    // 1) Eligible at all? (confirmed, parent/manager/co-guardian, deliverable)
    const { data: cand, error: cErr } = await db.rpc("welcome_email_candidate", { p_user_id: userId });
    if (cErr) throw cErr;
    const person = (cand ?? [])[0] as { email: string; language: string; suppressed: boolean } | undefined;
    if (!person) return json({ status: "not_eligible" });

    // 2) Once per person
    const { data: claimed, error: clErr } = await db.rpc("welcome_email_claim", { p_user_id: userId, p_trigger: trigger, p_email: person.email });
    if (clErr) throw clErr;
    if (claimed !== true) return json({ status: "already_handled" });

    // 3) Unsubscribed people get nothing
    if (person.suppressed) {
      await setRow({ status: "suppressed" });
      return json({ status: "suppressed" });
    }

    // 4) Content in the person's language (EN fallback)
    const wanted = (person.language || "en").toUpperCase();
    const { data: rows, error: wErr } = await db.from("welcome_emails").select("language, title, content").in("language", [wanted, "EN"]);
    if (wErr) throw wErr;
    const version = (rows ?? []).find((r: { language: string }) => r.language === wanted) ?? (rows ?? []).find((r: { language: string }) => r.language === "EN");
    if (!version) { await setRow({ status: "failed", error: "no welcome content" }); return json({ status: "failed" }, 500); }

    // 5) Unsubscribe token (never send without it)
    const { data: token, error: tErr } = await db.rpc("newsletter_unsubscribe_token", { p_user_id: userId, p_campaign: TOKEN_CAMPAIGN });
    if (tErr || !token) { await setRow({ status: "failed", error: `no unsubscribe token: ${tErr?.message ?? "empty"}` }); return json({ status: "failed" }, 500); }

    // 6) Send
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) { await setRow({ status: "failed", error: "RESEND_API_KEY not configured" }); return json({ status: "failed" }, 500); }
    const email = renderNewsletterEmail({
      title: version.title, markdown: version.content, language: version.language,
      unsubscribeUrl: unsubscribePageUrl(String(token), version.language),
    });
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: email.from, to: [person.email], subject: email.subject, html: email.html, headers: listUnsubscribeHeaders(String(token)) }),
    });
    const out = await res.json().catch(() => ({}));
    const ok = res.ok;
    await setRow(ok
      ? { status: "sent", language: version.language, resend_id: String(out.id ?? ""), error: null }
      : { status: "failed", language: version.language, error: `${res.status} ${JSON.stringify(out).slice(0, 300)}` });
    await db.from("messages_log").insert({ parent_id: userId, channel: "email", message_type: `welcome:${trigger}`, status: ok ? "sent" : "failed" });
    console.log(`[send-welcome-email] ${trigger} ${userId}: ${ok ? "sent" : "failed"} (${version.language})`);
    return json({ status: ok ? "sent" : "failed", language: version.language }, ok ? 200 : 502);
  } catch (e) {
    console.error("[send-welcome-email] error:", e);
    // leave a claimed row retryable
    await setRow({ status: "failed", error: e instanceof Error ? e.message : String(e) }).catch(() => {});
    return json({ error: "Internal error" }, 500);
  }
});
