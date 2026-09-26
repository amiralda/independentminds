// Trigger: public (no login) — the "Unsubscribe" link of the newsletter.
// Auth: none (verify_jwt = false); the single-use random token is the proof.
//   POST  token in JSON {token}, a form field, or ?token= (RFC 8058 one-click:
//         mail providers POST "List-Unsubscribe=One-Click" to the header URL)
//         -> { status: "unsubscribed" | "already_used" | "invalid" }
//   GET   never unsubscribes (link scanners prefetch GETs): redirects to the
//         confirmation page on www, which POSTs here when the person confirms.
// Side effects: email_unsubscribe_tokens.used_at, suppressed_emails row
// (atomic, in public.newsletter_unsubscribe). Newsletter only: account
// emails (reminders, password reset…) are not affected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PAGE = "https://www.independentmindsedu.org/unsubscribe";
const TOKEN_RE = /^[A-Za-z0-9_-]{20,100}$/;

async function readToken(req: Request, url: URL): Promise<string> {
  const fromQuery = url.searchParams.get("token");
  if (fromQuery) return fromQuery;
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) return String((await req.json()).token ?? "");
    if (type.includes("form")) return String((await req.formData()).get("token") ?? "");
  } catch { /* fall through */ }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    const target = TOKEN_RE.test(token) ? `${PAGE}?token=${encodeURIComponent(token)}` : PAGE;
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: target } });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (await readToken(req, url)).trim();
  if (!TOKEN_RE.test(token)) return json({ status: "invalid" }, 404);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await db.rpc("newsletter_unsubscribe", { p_token: token });
    if (error) throw error;
    const status = String(data);
    if (status === "unsubscribed") {
      console.log("[unsubscribe] token used");
      return json({ status });
    }
    return json({ status }, status === "already_used" ? 410 : 404);
  } catch (e) {
    console.error("[unsubscribe] error:", e);
    return json({ error: "Internal error" }, 500);
  }
});
