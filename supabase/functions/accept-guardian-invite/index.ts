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

    // Look up invite
    const { data: invite, error: lookupErr } = await admin
      .from("guardian_invites")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (lookupErr || !invite) {
      return new Response(JSON.stringify({ error: "Invalid or expired invite" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      // Mark as expired
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

    // Create co-guardian record
    const { error: insertErr } = await admin.from("co_guardians").insert({
      student_id: invite.student_id,
      guardian_id: user.id,
      invited_by: invite.invited_by,
      can_view_progress: true,
      can_receive_sos: false,
      can_approve_rewards: false,
      can_edit_lessons: false,
      is_full_access: false,
    });

    if (insertErr) {
      if (insertErr.message.includes("duplicate") || insertErr.code === "23505") {
        return new Response(JSON.stringify({ error: "You are already a co-guardian for this student" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw insertErr;
    }

    // Mark invite as accepted
    await admin
      .from("guardian_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() } as any)
      .eq("id", invite.id);

    // Get student name for response
    const { data: student } = await admin
      .from("students")
      .select("display_name")
      .eq("student_id", invite.student_id)
      .single();

    // Send inbox notification to primary parent
    await admin.from("inbox_messages").insert({
      parent_id: invite.invited_by,
      student_id: invite.student_id,
      message_type: "lesson_completed",
      title: "Co-guardian invite accepted",
      body: `${user.email} has accepted the co-guardian invite for ${student?.display_name || "your student"}.`,
    });

    return new Response(JSON.stringify({
      success: true,
      student_id: invite.student_id,
      student_name: student?.display_name || "Student",
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
