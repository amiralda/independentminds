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

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = await req.json();
    if (!token || typeof token !== "string" || token.length < 32) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash the provided token
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Find the invite
    const { data: invite, error: findErr } = await admin
      .from("educator_invites")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("status", "pending")
      .single();

    if (findErr || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found or already used" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This invite has expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Self-accept block
    if (invite.parent_id === user.id) {
      return new Response(JSON.stringify({ error: "You cannot accept your own invite" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or get educator record
    const { data: existingEducator } = await admin
      .from("educators")
      .select("id")
      .eq("user_id", user.id)
      .eq("invited_by", invite.parent_id)
      .maybeSingle();

    let educatorId: string;
    if (existingEducator) {
      educatorId = existingEducator.id;
    } else {
      const { data: newEducator, error: eduErr } = await admin
        .from("educators")
        .insert({ user_id: user.id, invited_by: invite.parent_id })
        .select("id")
        .single();
      if (eduErr) throw eduErr;
      educatorId = newEducator.id;
    }

    // Determine which students to assign
    const perms = (invite.permissions || {}) as any;
    
    if (invite.student_id) {
      // Single student
      await admin.from("educator_students").upsert({
        educator_id: educatorId,
        student_id: invite.student_id,
        can_edit_schedule: perms.can_edit_schedule || false,
        can_view_checkins: perms.can_view_checkins !== false,
        can_use_ai_tutor: perms.can_use_ai_tutor || false,
        can_view_reports: perms.can_view_reports !== false,
        can_receive_sos: perms.can_receive_sos || false,
      }, { onConflict: "educator_id,student_id" });
    } else {
      // All parent's students
      const { data: parentStudents } = await admin
        .from("students")
        .select("student_id")
        .eq("parent_id", invite.parent_id);
      
      if (parentStudents && parentStudents.length > 0) {
        for (const s of parentStudents) {
          await admin.from("educator_students").upsert({
            educator_id: educatorId,
            student_id: s.student_id,
            can_edit_schedule: perms.can_edit_schedule || false,
            can_view_checkins: perms.can_view_checkins !== false,
            can_use_ai_tutor: perms.can_use_ai_tutor || false,
            can_view_reports: perms.can_view_reports !== false,
            can_receive_sos: perms.can_receive_sos || false,
          }, { onConflict: "educator_id,student_id" });
        }
      }
    }

    // Add educator role
    await admin.from("user_roles").upsert(
      { user_id: user.id, role: "educator" },
      { onConflict: "user_id,role" }
    );

    // Mark invite as accepted
    await admin
      .from("educator_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    return new Response(JSON.stringify({
      success: true,
      educator_id: educatorId,
      message: "Educator access granted successfully",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("accept-educator-invite error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
