import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://www.independentmindsedu.org";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Returns a fresh "set your password" (recovery) link for a student who
// already has a login, for the parent/Manager to hand over. Same permission
// gate as create-student-account. Throttled to one request per account every
// 15 minutes (password_reset_requests, shared with request-password-reset);
// a throttled request never reaches Supabase Auth.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized: missing token" }, 401);

    // Caller-scoped client: can_impersonate_student() evaluates auth.uid().
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: "Unauthorized: invalid session" }, 401);

    const { student_id } = await req.json();
    if (!student_id || typeof student_id !== "string") return json({ error: "Missing student_id" }, 400);

    const { data: allowed, error: permErr } = await callerClient.rpc("can_impersonate_student", { p_student_id: student_id });
    if (permErr) return json({ error: "Permission check failed" }, 500);
    if (allowed !== true) return json({ error: "Forbidden: you cannot manage this student" }, 403);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: student } = await admin
      .from("students").select("id, parent_id, user_id").eq("id", student_id).maybeSingle();
    if (!student) return json({ error: "Student not found" }, 404);
    if (!student.user_id) return json({ error: "This student has no login account yet", code: "no_account" }, 409);

    const { data: authUser, error: userErr } = await admin.auth.admin.getUserById(student.user_id);
    const email = authUser?.user?.email;
    if (userErr || !email) return json({ error: "Student login account not found" }, 404);

    const { data: claim, error: claimErr } = await admin.rpc("claim_password_reset", {
      p_user_id: student.user_id,
      p_student_id: student.id,
      p_requested_by: student.parent_id === caller.id ? "parent" : "manager",
      p_actor: caller.id,
    });
    if (claimErr || !claim) return json({ error: "Could not check the reset limit" }, 500);
    if (!claim.allowed) {
      return json({
        error: "A reset link was requested for this account recently. Please wait before asking again.",
        code: "rate_limited",
        retry_after_seconds: claim.retry_after_seconds,
      }, 429);
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${SITE_URL}/reset-password` },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error("reset-student-password: generateLink failed", linkErr);
      const rateLimited = linkErr?.status === 429 || /rate limit|too many/i.test(linkErr?.message ?? "");
      // Free the slot unless Auth itself is throttling (retrying now would fail again).
      if (!rateLimited) await admin.from("password_reset_requests").delete().eq("id", claim.request_id);
      return rateLimited
        ? json({ error: "Too many reset requests right now. Please wait before asking again.", code: "rate_limited", retry_after_seconds: 15 * 60 }, 429)
        : json({ error: "Could not create the reset link" }, 500);
    }

    return json({ success: true, student_id: student.id, reset_link: linkData.properties.action_link }, 200);
  } catch (err) {
    console.error("reset-student-password error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
