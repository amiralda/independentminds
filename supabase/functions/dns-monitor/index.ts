// DNS Monitor: checks independentmindsedu.org and alerts on status changes
// Trigger: pg_cron every 15 min via net.http_post (Authorization: Bearer CRON_SECRET)
// Auth: shared-secret header (CRON_SECRET) — verify_jwt=false
// Side effects: reads/writes public.dns_monitor_state, sends email (Resend) + WhatsApp (Twilio)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendWhatsApp } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APEX_DOMAIN = Deno.env.get("MONITOR_DOMAIN") || "independentmindsedu.org";
const WWW_DOMAIN = Deno.env.get("MONITOR_CANONICAL_DOMAIN") || "www.independentmindsedu.org";
const EXPECTED_A = "185.158.133.1";

type Check = {
  overall: "ok" | "nxdomain" | "a_mismatch" | "txt_missing" | "unreachable" | "degraded";
  domain: string;
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

async function runCheck(domain: string): Promise<Check> {
  try {
    const [rootA, ns] = await Promise.all([
      doh(domain, "A"),
      doh(domain, "NS"),
    ]);
    const aRecords = (rootA.Answer ?? []).map((a) => a.data);
    const txtRecords: string[] = [];

    if (rootA.Status === 3 || ns.Status === 3) {
      return {
        domain,
        overall: "nxdomain",
        aRecords, txtRecords,
        nsStatus: ns.Status, rootStatus: rootA.Status,
        details: `NXDOMAIN at registry — nameservers not delegated for ${domain}`,
      };
    }
    const aOk = aRecords.includes(EXPECTED_A);
    if (!aOk) {
      return { domain, overall: "a_mismatch", aRecords, txtRecords, nsStatus: ns.Status, rootStatus: rootA.Status,
        details: `A record does not point to ${EXPECTED_A}. Got: ${aRecords.join(", ") || "(none)"}` };
    }
    return { domain, overall: "ok", aRecords, txtRecords, nsStatus: ns.Status, rootStatus: rootA.Status,
      details: `Domain resolves and points to ${EXPECTED_A}.` };
  } catch (e) {
    return {
      domain,
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
      from: "Independent Minds EDU Alerts <alerts@notify.independentmindsedu.org>",
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

  const now = new Date().toISOString();
  const checks = await Promise.all([runCheck(APEX_DOMAIN), runCheck(WWW_DOMAIN)]);
  const results = [];
  const alerts = [];

  for (const check of checks) {
    const { data: prev } = await supabase
      .from("dns_monitor_state")
      .select("*")
      .eq("domain", check.domain)
      .maybeSingle();

    const changed = !prev || prev.status !== check.overall;

    await supabase.from("dns_monitor_state").upsert({
      domain: check.domain,
      status: check.overall,
      a_records: check.aRecords,
      txt_records: check.txtRecords,
      details: check.details,
      last_checked_at: now,
      last_changed_at: changed ? now : prev?.last_changed_at ?? now,
      previous_status: changed ? prev?.status ?? null : prev?.previous_status ?? null,
    }, { onConflict: "domain" });

    await supabase.from("dns_monitor_history").insert({
      domain: check.domain,
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

    results.push({ domain: check.domain, changed, check });

    if (!changed) {
      alerts.push({ domain: check.domain, email: null, whatsapp: null });
      continue;
    }

    const from = prev?.status ?? "unknown";
    const to = check.overall;
    const isRecovery = to === "ok";
    const subject = isRecovery
      ? `✅ DNS recovered: ${check.domain} is OK`
      : `🚨 DNS alert: ${check.domain} → ${to.toUpperCase()}`;
    const html = `
      <h2>${subject}</h2>
      <p><strong>Domain:</strong> ${check.domain}</p>
      <p><strong>Status:</strong> ${from} → <b>${to}</b></p>
      <p><strong>Details:</strong> ${check.details}</p>
      <p><strong>A records:</strong> ${check.aRecords.join(", ") || "(none)"}</p>
      <p style="color:#888;font-size:12px">Checked ${now}</p>`;
    const plain =
      `${subject}\n${check.domain}: ${from} -> ${to}\n${check.details}\n` +
      `A: ${check.aRecords.join(", ") || "(none)"}\nTXT: ${check.txtRecords.join(", ") || "(none)"}`;

    const email = await sendEmail(subject, html);

    const waTo = Deno.env.get("ADMIN_WHATSAPP_NUMBER");
    let whatsapp: unknown;
    if (waTo) {
      try { whatsapp = await sendWhatsApp(waTo, plain); }
      catch (e) { whatsapp = { ok: false, error: String(e) }; }
    } else {
      whatsapp = { skipped: "missing_ADMIN_WHATSAPP_NUMBER" };
    }

    alerts.push({ domain: check.domain, email, whatsapp });
  }

  return new Response(JSON.stringify({ ok: true, results, alerts }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
