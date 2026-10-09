// Trigger: public (no login) — the footer links and List-Unsubscribe header of
// the family's automatic emails (morning reminder, check-in reminder, daily
// report, weekly badge).
// Auth: none (verify_jwt = false); the per-person random token is the proof.
// Same pattern as `unsubscribe` (newsletter):
//   GET   never changes anything (link scanners prefetch GETs): redirects to
//         the www page /notifications, which POSTs when the person clicks.
//   POST  JSON {token, category?, state?, paused_until?}
//           - no category        -> read only
//           - category + state   -> apply (on | paused + paused_until | off)
//         -> 200 {status:"ok", email: "j•••@gmail.com", prefs:[...]}
//   POST  form "List-Unsubscribe=One-Click" with ?token=&category= (RFC 8058:
//         mail providers POST to the header URL) -> that category 'off' only.
// Invalid, unknown or deleted token -> always the same 404 {status:"invalid"},
// so nobody can probe which accounts exist.
// Side effects: notification_preferences rows of the token's owner only
// (public.apply_notification_token_action, service_role only).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PAGE = "https://www.independentmindsedu.org/notifications";
const TOKEN_RE = /^[0-9a-f]{64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES = ["all", "morning_reminder", "checkin_reminder", "daily_report", "weekly_badge"];
const STATES = ["on", "paused", "off"];
const LANGS = ["en", "ht", "fr", "es", "pt", "ar", "zh", "de", "ja", "ru"];
const MAX_PAUSE_DAYS = 90;

/** "julna@gmail.com" -> "j•••@gmail.com": enough to recognise, not to copy. */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  return `${Array.from(local)[0] ?? ""}•••@${domain}`;
}

/** Today on the Haiti calendar (pauses are Haiti dates), as YYYY-MM-DD. */
export function haitiToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Port-au-Prince" });
}

const addDays = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** paused_until = first day mail resumes: from tomorrow to +90 days (Haiti). */
export function isValidResumeDate(ymd: unknown, now = new Date()): ymd is string {
  if (typeof ymd !== "string" || !DATE_RE.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const real = new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
  if (real !== ymd) return false; // e.g. 2026-02-30
  const today = haitiToday(now);
  return ymd > today && ymd <= addDays(today, MAX_PAUSE_DAYS);
}

interface Action {
  token: string;
  category: string | null;
  state: string | null;
  pausedUntil: string | null;
}

async function readAction(req: Request, url: URL): Promise<Action> {
  const q = url.searchParams;
  const type = req.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  let oneClick = false;
  try {
    if (type.includes("application/json")) body = await req.json();
    else if (type.includes("form")) {
      const form = await req.formData();
      oneClick = form.get("List-Unsubscribe") === "One-Click";
      body = Object.fromEntries(form.entries());
    }
  } catch { /* empty or malformed body: treated as missing fields */ }

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const token = str(body.token) ?? str(q.get("token")) ?? "";
  if (oneClick) {
    // RFC 8058: the header URL carries token + category; the POST means "stop".
    return { token, category: str(q.get("category")), state: "off", pausedUntil: null };
  }
  return { token, category: str(body.category), state: str(body.state), pausedUntil: str(body.paused_until) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    const category = url.searchParams.get("category") ?? "";
    const lang = (url.searchParams.get("lang") ?? "").toLowerCase();
    const params = new URLSearchParams();
    if (TOKEN_RE.test(token)) params.set("token", token);
    if (LANGS.includes(lang)) params.set("lang", lang);
    if (CATEGORIES.includes(category)) params.set("category", category);
    const qs = params.toString();
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: qs ? `${PAGE}?${qs}` : PAGE } });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const action = await readAction(req, url);
  if (!TOKEN_RE.test(action.token)) return json({ status: "invalid" }, 404);

  if (action.category !== null) {
    if (!CATEGORIES.includes(action.category)) return json({ status: "bad_request", field: "category" }, 400);
    if (!action.state || !STATES.includes(action.state)) return json({ status: "bad_request", field: "state" }, 400);
    if (action.state === "paused" && !isValidResumeDate(action.pausedUntil)) {
      return json({ status: "bad_request", field: "paused_until" }, 400);
    }
  }

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await db.rpc("apply_notification_token_action", {
      p_token: action.token,
      p_category: action.category,
      p_state: action.category === null ? null : action.state,
      p_paused_until: action.category !== null && action.state === "paused" ? action.pausedUntil : null,
    });
    if (error) {
      if (error.code === "28000") return json({ status: "invalid" }, 404);
      if (error.code === "22023" || error.code === "23514") return json({ status: "bad_request" }, 400);
      throw error;
    }
    const result = data as { email: string | null; prefs: unknown[] };
    if (action.category !== null) console.log(`[notification-preferences] ${action.category} -> ${action.state}`);
    return json({ status: "ok", email: maskEmail(result.email), prefs: result.prefs ?? [] });
  } catch (e) {
    console.error("[notification-preferences] error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
