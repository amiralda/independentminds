import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://www.independentmindsedu.org";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Public "Forgot password?" for every account type (parent, Manager,
// co-guardian, student). Throttled to one request per account every 15
// minutes (password_reset_requests, shared with reset-student-password); a
// throttled request never reaches Supabase Auth, which protects the project's
// Auth email rate limit. Unknown emails get the same success response and
// send nothing, so the form can't be used to discover which emails exist.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { email } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return json({ error: "A valid email is required", code: "invalid_email" }, 400);
    }
    const normalizedEmail = email.trim().toLowerCase();

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userId, error: lookupErr } = await admin.rpc("find_auth_user_id_by_email", { p_email: normalizedEmail });
    if (lookupErr) {
      console.error("request-password-reset: lookup failed", lookupErr);
      return json({ error: "Could not send the reset email" }, 500);
    }
    if (!userId) return json({ success: true }, 200);

    const { data: student } = await admin.from("students").select("id").eq("user_id", userId).maybeSingle();

    const { data: claim, error: claimErr } = await admin.rpc("claim_password_reset", {
      p_user_id: userId,
      p_student_id: student?.id ?? null,
      p_requested_by: "self",
      p_actor: null,
    });
    if (claimErr || !claim) return json({ error: "Could not check the reset limit" }, 500);
    if (!claim.allowed) {
      return json({
        error: "A reset email was sent to this account recently. Please wait before asking again.",
        code: "rate_limited",
        retry_after_seconds: claim.retry_after_seconds,
      }, 429);
    }

    // Anon client so Auth sends the normal recovery email (via auth-email-hook).
    const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { error: sendErr } = await publicClient.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${SITE_URL}/reset-password`,
    });

    if (sendErr) {
      console.error("request-password-reset: send failed", sendErr);
      const rateLimited = sendErr.status === 429 || /rate limit|too many|security purposes/i.test(sendErr.message);
      if (!rateLimited) await admin.from("password_reset_requests").delete().eq("id", claim.request_id);
      return rateLimited
        ? json({ error: "Too many reset requests right now. Please wait before asking again.", code: "rate_limited", retry_after_seconds: 15 * 60 }, 429)
        : json({ error: "Could not send the reset email" }, 500);
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error("request-password-reset error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
