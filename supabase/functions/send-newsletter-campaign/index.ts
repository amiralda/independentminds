// Trigger: manual (admin) OR the weekly cron (scheduled mode, below).
// Auth: admin JWT (has_role admin), checked server-side — unchanged. The cron
//   instead sends x-cron-secret (= CRON_SECRET, read from Vault by pg_cron);
//   a request carrying that header is ONLY ever the cron: a wrong secret is
//   401 and never falls through to the admin path.
// Scheduled (cron, body '{}'): sends the campaign whose scheduled_for is
//   today's date in America/New_York, only if EVERY language version of it is
//   scheduled for today AND 'approved'. Otherwise 200 + a reason, nothing
//   written, nothing sent (fail closed). Two campaigns on the same date:
//   nothing sent, error logged. Optional {check_date: 'YYYY-MM-DD'} evaluates
//   another date and returns the dry-run plan — it NEVER sends or writes.
// Body: { campaign, mode: "dry_run" | "test" | "send", test_emails?: string[], confirm?: string }
//   dry_run — who would get which language version; sends nothing.
//   test    — sends only to test_emails (each must be a real recipient, so the
//             whole path is exercised); no DB change. Works before approval.
//   send    — real send to every recipient. Requires every language version
//             'approved' AND confirm === campaign. Skips people already sent
//             to (newsletter_sends), so a re-run resumes safely. When nobody
//             is left, the campaign rows are marked 'sent'.
// Side effects (send): Resend emails, newsletter_sends + messages_log rows,
// email_newsletter_drafts.status = 'sent'. test + send: one unsubscribe token
// per person per campaign (email_unsubscribe_tokens); addresses in
// suppressed_emails are never sent to (excluded by newsletter_recipients and
// re-checked right before sending). No token -> no email (fail closed).
// Template: ../_shared/newsletter-email.ts — the same file the admin
// "Preview as email" renders, so what was previewed is what is sent.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { NEWSLETTER_FROM, listUnsubscribeHeaders, renderNewsletterEmail, unsubscribePageUrl } from "../_shared/newsletter-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Draft { language: string; title: string; content: string; status: string }
interface Recipient { user_id: string; email: string; language: string }

const mask = (e: string) => `${e.slice(0, 3)}…@${e.split("@")[1] ?? ""}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Resend's default limit is 2 requests/second.
const GAP_MS = 600;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in New York, YYYY-MM-DD, via Intl (DST-aware, no fixed offset).
 * Not `new Date(d.toLocaleString(...))`: that re-parses local wall time as
 * UTC and gives the wrong day around midnight. */
export function newYorkToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

async function sendEmail(
  apiKey: string, to: string, email: { from: string; subject: string; html: string },
  headers: Record<string, string>, idempotencyKey?: string,
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: email.from, to: [to], subject: email.subject, html: email.html, headers }),
  });
  const body = await res.json().catch(() => ({}));
  return res.ok ? { ok: true as const, id: String(body.id ?? "") } : { ok: false as const, error: `${res.status} ${JSON.stringify(body).slice(0, 300)}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");

  // --- scheduled (weekly cron) ------------------------------------------------
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== null) {
    const expected = Deno.env.get("CRON_SECRET");
    if (!expected || cronSecret !== expected) return json({ error: "Unauthorized" }, 401);
    return await runScheduled(req, createClient(url, serviceKey, { auth: { persistSession: false } }), resendKey);
  }

  // --- admin only -----------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  // has_role(user_id uuid, role text): with the service role (auth.uid() null)
  // it answers for any user.
  const { data: isAdmin, error: roleErr } = await db.rpc("has_role", { user_id: user.id, role: "admin" });
  if (roleErr) console.error("[send-newsletter-campaign] has_role failed:", roleErr);
  if (isAdmin !== true) return json({ error: "Forbidden: admin only" }, 403);

  // --- input ----------------------------------------------------------------
  let body: { campaign?: string; mode?: string; test_emails?: string[]; confirm?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const campaign = String(body.campaign ?? "").trim();
  const mode = body.mode ?? "dry_run";
  if (!campaign) return json({ error: "campaign is required" }, 400);
  if (!["dry_run", "test", "send"].includes(mode)) return json({ error: "mode must be dry_run, test or send" }, 400);

  return await runCampaign(db, resendKey, campaign, mode, body, user.id, "manual");
});

// The campaign run shared by the admin path and the cron. Unchanged logic:
// skip people already in newsletter_sends, re-check suppressed_emails, one
// unsubscribe token per person, Idempotency-Key, mark 'sent' when done.
async function runCampaign(
  db: SupabaseClient,
  resendKey: string | undefined,
  campaign: string,
  mode: string,
  body: { test_emails?: string[]; confirm?: string },
  sentBy: string | null,
  trigger: "manual" | "scheduled",
): Promise<Response> {
  try {
    const { data: drafts, error: dErr } = await db
      .from("email_newsletter_drafts").select("language, title, content, status").eq("campaign", campaign);
    if (dErr) throw dErr;
    const versions = (drafts ?? []) as Draft[];
    if (versions.length === 0) return json({ error: `No article for campaign '${campaign}'` }, 404);
    const byLang = new Map(versions.map((v) => [v.language.toLowerCase(), v]));
    const allApproved = versions.every((v) => v.status === "approved");
    const alreadySent = versions.every((v) => v.status === "sent");

    const pick = (lang: string) => byLang.get(lang.toLowerCase()) ?? byLang.get("en") ?? versions[0];

    const { data: recRows, error: rErr } = await db.rpc("newsletter_recipients");
    if (rErr) throw rErr;
    let recipients = (recRows ?? []) as Recipient[];

    if (mode === "send") {
      if (alreadySent) return json({ error: "This campaign was already sent" }, 409);
      if (!allApproved) {
        return json({ error: "Refused: every language version must be 'approved'", statuses: versions.map((v) => `${v.language}:${v.status}`) }, 409);
      }
      if (body.confirm !== campaign) return json({ error: "Refused: set confirm to the campaign name to send for real" }, 400);
    }

    if (mode === "test") {
      const wanted = (body.test_emails ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean);
      if (wanted.length === 0 || wanted.length > 5) return json({ error: "test_emails: 1 to 5 addresses" }, 400);
      const missing = wanted.filter((e) => !recipients.some((r) => r.email === e));
      if (missing.length) return json({ error: "Every test address must be a real recipient (parent / co-guardian / manager account)", missing }, 400);
      recipients = recipients.filter((r) => wanted.includes(r.email));
    }

    // Real send: skip people already sent to (resume after a partial failure).
    let skipped = 0;
    if (mode === "send") {
      const { data: done } = await db.from("newsletter_sends").select("user_id").eq("campaign", campaign).eq("status", "sent");
      const doneIds = new Set((done ?? []).map((d: { user_id: string }) => d.user_id));
      skipped = recipients.filter((r) => doneIds.has(r.user_id)).length;
      recipients = recipients.filter((r) => !doneIds.has(r.user_id));
    }

    const plan = recipients.map((r) => ({ ...r, version: pick(r.language) }));
    const byLanguage: Record<string, number> = {};
    for (const p of plan) byLanguage[p.version.language] = (byLanguage[p.version.language] ?? 0) + 1;

    if (mode === "dry_run") {
      return json({
        mode, campaign, from: NEWSLETTER_FROM, approved: allApproved, statuses: versions.map((v) => `${v.language}:${v.status}`),
        recipients: plan.length, by_language: byLanguage,
        list: plan.map((p) => ({ email: mask(p.email), profile_language: p.language, version: p.version.language })),
      });
    }

    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    // Defense in depth: re-check the suppression list right before sending.
    const { data: suppressedRows, error: sErr } = await db.from("suppressed_emails").select("email").in("email", plan.map((p) => p.email));
    if (sErr) throw sErr;
    const suppressed = new Set((suppressedRows ?? []).map((r: { email: string }) => r.email));

    const results: Array<{ email: string; version: string; status: "sent" | "failed" | "suppressed"; error?: string }> = [];
    for (const [i, p] of plan.entries()) {
      if (suppressed.has(p.email)) {
        results.push({ email: mask(p.email), version: p.version.language, status: "suppressed" });
        continue;
      }
      if (i > 0) await sleep(GAP_MS);
      // One single-use token per person per campaign; never send without it.
      const { data: token, error: tErr } = await db.rpc("newsletter_unsubscribe_token", { p_user_id: p.user_id, p_campaign: campaign });
      const r = tErr || !token
        ? { ok: false as const, error: `no unsubscribe token: ${tErr?.message ?? "empty"}` }
        : await sendEmail(
          resendKey,
          p.email,
          renderNewsletterEmail({
            title: p.version.title, markdown: p.version.content, language: p.version.language,
            unsubscribeUrl: unsubscribePageUrl(String(token), p.version.language),
          }),
          listUnsubscribeHeaders(String(token)),
          mode === "send" ? `newsletter/${campaign}/${p.user_id}` : undefined,
        );
      results.push({ email: mask(p.email), version: p.version.language, status: r.ok ? "sent" : "failed", ...(r.ok ? {} : { error: r.error }) });

      if (mode === "send") {
        await db.from("newsletter_sends").upsert({
          campaign, user_id: p.user_id, email: p.email, language: p.version.language,
          status: r.ok ? "sent" : "failed", resend_id: r.ok ? r.id : null, error: r.ok ? null : r.error,
          sent_by: sentBy, updated_at: new Date().toISOString(),
        }, { onConflict: "campaign,user_id" });
        await db.from("messages_log").insert({
          parent_id: p.user_id, channel: "email", message_type: `newsletter:${campaign}`, status: r.ok ? "sent" : "failed",
        });
      }
    }

    const failed = results.filter((r) => r.status === "failed").length;
    const skippedSuppressed = results.filter((r) => r.status === "suppressed").length;
    let markedSent = false;
    if (mode === "send" && failed === 0) {
      // Everyone on the list has now received it: close the campaign.
      const { error } = await db.from("email_newsletter_drafts").update({ status: "sent" }).eq("campaign", campaign);
      if (error) console.error("[send-newsletter-campaign] mark sent failed:", error);
      markedSent = !error;
    }

    const sent = results.length - failed - skippedSuppressed;
    console.log(`[send-newsletter-campaign] ${trigger} ${mode} ${campaign} by ${sentBy ?? "cron"}: sent=${sent} failed=${failed} skipped=${skipped} suppressed=${skippedSuppressed}`);
    return json({
      mode, trigger, campaign, from: NEWSLETTER_FROM, recipients: plan.length, sent, failed,
      skipped_already_sent: skipped, skipped_suppressed: skippedSuppressed, by_language: byLanguage, marked_sent: markedSent, results,
    });
  } catch (e) {
    console.error("[send-newsletter-campaign] error:", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
}

interface ScheduledRow { campaign: string; language: string; status: string; scheduled_for: string | null }

// Weekly cron. Fail closed: anything unexpected -> nothing written, nothing sent.
async function runScheduled(req: Request, db: SupabaseClient, resendKey: string | undefined): Promise<Response> {
  let body: { check_date?: unknown } = {};
  try { body = await req.json(); } catch { /* the cron sends '{}'; an empty body is fine */ }
  const evaluateOnly = body.check_date !== undefined;
  if (evaluateOnly && (typeof body.check_date !== "string" || !DATE_RE.test(body.check_date))) {
    return json({ error: "check_date must be YYYY-MM-DD" }, 400);
  }
  const date = evaluateOnly ? (body.check_date as string) : newYorkToday();
  const skip = (reason: string, extra: Record<string, unknown> = {}) => {
    console.log(`[send-newsletter-campaign] scheduled ${date}: ${reason} — nothing sent`);
    return json({ mode: "scheduled", date, evaluate_only: evaluateOnly, sent: 0, reason, ...extra });
  };

  const { data: dated, error: dErr } = await db
    .from("email_newsletter_drafts").select("campaign, language, status, scheduled_for").eq("scheduled_for", date);
  if (dErr) {
    console.error("[send-newsletter-campaign] scheduled lookup failed:", dErr);
    return json({ mode: "scheduled", date, sent: 0, reason: "lookup_failed" }, 500);
  }
  const campaigns = [...new Set(((dated ?? []) as ScheduledRow[]).map((r) => r.campaign))];
  if (campaigns.length === 0) return skip("no_campaign_today");
  if (campaigns.length > 1) {
    console.error(`[send-newsletter-campaign] scheduled ${date}: ${campaigns.length} campaigns on the same date (${campaigns.join(", ")}) — nothing sent`);
    return skip("multiple_campaigns", { campaigns });
  }

  // Every language version of that campaign, not only the rows dated today.
  const campaign = campaigns[0];
  const { data: all, error: aErr } = await db
    .from("email_newsletter_drafts").select("campaign, language, status, scheduled_for").eq("campaign", campaign);
  if (aErr) {
    console.error("[send-newsletter-campaign] scheduled lookup failed:", aErr);
    return json({ mode: "scheduled", date, sent: 0, reason: "lookup_failed" }, 500);
  }
  const versions = (all ?? []) as ScheduledRow[];
  const statuses = versions.map((v) => `${v.language}:${v.status}`);
  if (versions.every((v) => v.status === "sent")) return skip("already_sent", { campaign, statuses });
  if (versions.some((v) => v.scheduled_for !== date)) return skip("date_mismatch", { campaign, statuses });
  if (!versions.every((v) => v.status === "approved")) return skip("not_approved", { campaign, statuses });

  // check_date only evaluates: return the read-only dry-run plan, never send.
  if (evaluateOnly) return await runCampaign(db, resendKey, campaign, "dry_run", {}, null, "scheduled");
  // Conditions verified above stand in for the manual "confirm"; runCampaign
  // re-checks approval and already-sent itself.
  return await runCampaign(db, resendKey, campaign, "send", { confirm: campaign }, null, "scheduled");
}
