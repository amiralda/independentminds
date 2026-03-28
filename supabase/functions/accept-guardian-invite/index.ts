import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Hash incoming token to match stored hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Look up invite by hash (supports both new hashed and legacy plaintext tokens)
    const { data: invite, error: lookupErr } = await admin
      .from("guardian_invites")
      .select("*")
      .eq("status", "pending")
      .or(`token_hash.eq.${tokenHash},token.eq.${token}`)
      .single();

    if (lookupErr || !invite) {
      return new Response(JSON.stringify({ error: "Invalid or expired invite" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      await admin
        .from("guardian_invites")
        .update({ status: "expired" } as any)
        .eq("id", invite.id);

      return new Response(JSON.stringify({ error: "This invite link has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent the primary parent from accepting their own invite
    if (invite.invited_by === user.id) {
      return new Response(JSON.stringify({ error: "You cannot accept your own invite" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract permissions from invite
    const perms = invite.permissions || {};
    const canViewProgress = perms.can_view_progress !== false;
    const canReceiveSos = perms.can_receive_sos === true;
    const canApproveRewards = perms.can_approve_rewards === true;
    const canEditLessons = perms.can_edit_lessons === true;
    const isFullAccess = perms.is_full_access === true;

    // Fetch ALL students belonging to the primary guardian
    const { data: allStudents, error: studentsErr } = await admin
      .from("students")
      .select("student_id, display_name")
      .eq("parent_id", invite.invited_by);

    if (studentsErr || !allStudents || allStudents.length === 0) {
      return new Response(JSON.stringify({ error: "No students found for the primary guardian" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create co-guardian records for ALL students of the primary parent
    const insertRows = allStudents.map((s) => ({
      student_id: s.student_id,
      guardian_id: user.id,
      invited_by: invite.invited_by,
      can_view_progress: isFullAccess || canViewProgress,
      can_receive_sos: isFullAccess || canReceiveSos,
      can_approve_rewards: isFullAccess || canApproveRewards,
      can_edit_lessons: isFullAccess || canEditLessons,
      is_full_access: isFullAccess,
    }));

    const { error: insertErr } = await admin
      .from("co_guardians")
      .upsert(insertRows, { onConflict: "student_id,guardian_id", ignoreDuplicates: true });

    if (insertErr) {
      console.error("co_guardians insert error:", insertErr);
      throw insertErr;
    }

    // CRITICAL: Set co-guardian's profile role to "parent" (not student)
    await admin
      .from("profiles")
      .update({ role: "parent", student_id: null })
      .eq("id", user.id);

    // Also update auth user metadata
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role: "parent",
      },
    });

    // Mark invite as accepted
    await admin
      .from("guardian_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() } as any)
      .eq("id", invite.id);

    const studentNames = allStudents.map((s) => s.display_name).join(", ");

    // Send inbox notification to primary parent
    await admin.from("inbox_messages").insert({
      parent_id: invite.invited_by,
      student_id: allStudents[0].student_id,
      message_type: "lesson_completed",
      title: "Co-guardian invite accepted",
      body: `${user.email} has accepted the co-guardian invite and now has access to: ${studentNames}.`,
    });

    return new Response(JSON.stringify({
      success: true,
      student_ids: allStudents.map((s) => s.student_id),
      student_names: studentNames,
      students_count: allStudents.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("accept-guardian-invite error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
