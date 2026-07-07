// DNS Monitor: checks independentmindsedu.com and alerts on status changes
// Trigger: pg_cron every 15 min via net.http_post (Authorization: Bearer CRON_SECRET)
// Auth: shared-secret header (CRON_SECRET) — verify_jwt=false
// Side effects: reads/writes public.dns_monitor_state, sends email (Resend) + WhatsApp (Twilio)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWhatsApp } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOMAIN = Deno.env.get("MONITOR_DOMAIN") || "independentmindsedu.com";
const EXPECTED_A = "185.158.133.1";
const EXPECTED_TXT_HOST = `_lovable.${DOMAIN}`;
const EXPECTED_TXT_PREFIX = "lovable_verify=";

type Check = {
  overall: "ok" | "nxdomain" | "a_mismatch" | "txt_missing" | "unreachable" | "degraded";
  aRecords: string[];
  txtRecords: string[];
  nsStatus: number | null;
  rootStatus: number | null;
  details: string;
};

async function doh(host: string, type: string) {
  const r = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`,
    { headers: { accept: "application/dns-json" } }
  );
  if (!r.ok) throw new Error(`DoH ${type} ${host} HTTP ${r.status}`);
  return await r.json() as { Status: number; Answer?: { data: string }[] };
}

async function runCheck(): Promise<Check> {
  try {
    const [rootA, txt, ns] = await Promise.all([
      doh(DOMAIN, "A"),
      doh(EXPECTED_TXT_HOST, "TXT"),
      doh(DOMAIN, "NS"),
    ]);
    const aRecords = (rootA.Answer ?? []).map((a) => a.data);
    const txtRecords = (txt.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, ""));

    if (rootA.Status === 3 || ns.Status === 3) {
      return {
        overall: "nxdomain",
        aRecords, txtRecords,
        nsStatus: ns.Status, rootStatus: rootA.Status,
        details: `NXDOMAIN at registry — nameservers not delegated for ${DOMAIN}`,
      };
    }
    const aOk = aRecords.includes(EXPECTED_A);
    const txtOk = txtRecords.some((t) => t.startsWith(EXPECTED_TXT_PREFIX));
    if (!aOk && !txtOk) {
      return { overall: "degraded", aRecords, txtRecords, nsStatus: ns.Status, rootStatus: rootA.Status,
        details: `A record and _lovable TXT both missing/incorrect.` };
    }
    if (!aOk) {
      return { overall: "a_mismatch", aRecords, txtRecords, nsStatus: ns.Status, rootStatus: rootA.Status,
        details: `A record does not point to ${EXPECTED_A}. Got: ${aRecords.join(", ") || "(none)"}` };
    }
    if (!txtOk) {
      return { overall: "txt_missing", aRecords, txtRecords, nsStatus: ns.Status, rootStatus: rootA.Status,
        details: `_lovable TXT verification record missing.` };
    }
    return { overall: "ok", aRecords, txtRecords, nsStatus: ns.Status, rootStatus: rootA.Status,
      details: `Domain resolves; A=${EXPECTED_A}; _lovable TXT present.` };
  } catch (e) {
    return {
      overall: "unreachable", aRecords: [], txtRecords: [],
      nsStatus: null, rootStatus: null,
      details: `DoH lookup failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function sendEmail(subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("BETA_ADMIN_EMAIL");
  if (!key || !to) return { ok: false, skipped: "missing_email_config" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "DNS Monitor <alerts@notify.independentmindsedu.com>",
      to: [to], subject, html,
    }),
  });
  return { ok: r.ok, status: r.status, body: await r.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("authorization") || "";
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const check = await runCheck();

  const { data: prev } = await supabase
    .from("dns_monitor_state")
    .select("*")
    .eq("domain", DOMAIN)
    .maybeSingle();

  const changed = !prev || prev.status !== check.overall;
  const now = new Date().toISOString();

  await supabase.from("dns_monitor_state").upsert({
    domain: DOMAIN,
    status: check.overall,
    a_records: check.aRecords,
    txt_records: check.txtRecords,
    details: check.details,
    last_checked_at: now,
    last_changed_at: changed ? now : prev?.last_changed_at ?? now,
    previous_status: changed ? prev?.status ?? null : prev?.previous_status ?? null,
  }, { onConflict: "domain" });

  await supabase.from("dns_monitor_history").insert({
    domain: DOMAIN,
    status: check.overall,
    previous_status: prev?.status ?? null,
    status_changed: changed,
    a_records: check.aRecords,
    txt_records: check.txtRecords,
    ns_status: check.nsStatus,
    root_status: check.rootStatus,
    details: check.details,
    checked_at: now,
  });

  const alerts: any = { email: null, whatsapp: null };
  if (changed) {
    const from = prev?.status ?? "unknown";
    const to = check.overall;
    const isRecovery = to === "ok";
    const subject = isRecovery
      ? `✅ DNS recovered: ${DOMAIN} is OK`
      : `🚨 DNS alert: ${DOMAIN} → ${to.toUpperCase()}`;
    const html = `
      <h2>${subject}</h2>
      <p><strong>Domain:</strong> ${DOMAIN}</p>
      <p><strong>Status:</strong> ${from} → <b>${to}</b></p>
      <p><strong>Details:</strong> ${check.details}</p>
      <p><strong>A records:</strong> ${check.aRecords.join(", ") || "(none)"}</p>
      <p><strong>_lovable TXT:</strong> ${check.txtRecords.join(", ") || "(none)"}</p>
      <p style="color:#888;font-size:12px">Checked ${now}</p>`;
    const plain =
      `${subject}\n${DOMAIN}: ${from} -> ${to}\n${check.details}\n` +
      `A: ${check.aRecords.join(", ") || "(none)"}\nTXT: ${check.txtRecords.join(", ") || "(none)"}`;

    alerts.email = await sendEmail(subject, html);

    const waTo = Deno.env.get("ADMIN_WHATSAPP_NUMBER");
    if (waTo) {
      try { alerts.whatsapp = await sendWhatsApp(waTo, plain); }
      catch (e) { alerts.whatsapp = { ok: false, error: String(e) }; }
    } else {
      alerts.whatsapp = { skipped: "missing_ADMIN_WHATSAPP_NUMBER" };
    }
  }

  return new Response(JSON.stringify({ ok: true, changed, check, alerts }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
