import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://www.independentmindsedu.org";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Creates a login account for an EXISTING students row and returns a
// "set your password" link for the parent to hand over. The caller must be
// allowed to manage that student (its parent, a Manager/co-guardian of the
// family, or an admin). Linking happens in handle_new_user() and is driven
// by the server-side student_account_invites row created here -- never by
// user metadata, which clients control on a normal signup.
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

    const { student_id, email } = await req.json();
    if (!student_id || typeof student_id !== "string") return json({ error: "Missing student_id" }, 400);
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return json({ error: "A valid email is required" }, 400);
    }
    const normalizedEmail = email.trim().toLowerCase();

    const { data: allowed, error: permErr } = await callerClient.rpc("can_impersonate_student", { p_student_id: student_id });
    if (permErr) return json({ error: "Permission check failed" }, 500);
    if (allowed !== true) return json({ error: "Forbidden: you cannot manage this student" }, 403);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: student } = await admin
      .from("students").select("id, display_name, user_id, language_pref").eq("id", student_id).maybeSingle();
    if (!student) return json({ error: "Student not found" }, 404);
    if (student.user_id) return json({ error: "This student already has a login account" }, 409);

    // Invite first, then create the auth user (handle_new_user consumes it).
    const { data: invite, error: inviteRowErr } = await admin
      .from("student_account_invites")
      .insert({ student_row_id: student.id, email: normalizedEmail, created_by: caller.id })
      .select("id").single();
    if (inviteRowErr || !invite) return json({ error: "Could not create invite" }, 500);

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "invite",
      email: normalizedEmail,
      options: {
        data: { display_name: student.display_name, language: (student.language_pref || "en").toLowerCase() },
        redirectTo: `${SITE_URL}/reset-password`,
      },
    });

    if (linkErr || !linkData?.user) {
      // Don't leave a claimable invite behind.
      await admin.from("student_account_invites").delete().eq("id", invite.id);
      const msg = linkErr?.message || "Failed to create the student account";
      const status = /already|registered|exists/i.test(msg) ? 409 : 400;
      return json({ error: status === 409 ? "This email is already used by another account" : msg }, status);
    }

    // Confirm the trigger linked the row (defensive: surfaces any mismatch).
    const { data: linked } = await admin.from("students").select("user_id").eq("id", student.id).maybeSingle();
    if (linked?.user_id !== linkData.user.id) {
      console.error("create-student-account: link mismatch", { student: student.id, user: linkData.user.id });
      return json({ error: "Account created but not linked to the student" }, 500);
    }

    return json({
      success: true,
      student_id: student.id,
      email: normalizedEmail,
      invite_link: linkData.properties?.action_link ?? null,
    }, 200);
  } catch (err) {
    console.error("create-student-account error:", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
