import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

    const { student_id, invitee_email, permissions } = await req.json();
    if (!invitee_email) {
      return new Response(JSON.stringify({ error: "Missing invitee_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = invitee_email.trim().toLowerCase();
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // If student_id is provided, verify caller is parent of that student
    if (student_id) {
      const { data: student } = await admin
        .from("students")
        .select("parent_id, display_name")
        .eq("student_id", student_id)
        .single();
      if (!student || student.parent_id !== user.id) {
        return new Response(JSON.stringify({ error: "You are not the parent of this student" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check for existing pending invite
    const query = admin
      .from("educator_invites")
      .select("id")
      .eq("invitee_email", email)
      .eq("parent_id", user.id)
      .eq("status", "pending");
    if (student_id) query.eq("student_id", student_id);
    
    const { data: existing } = await query.maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "An invite is already pending for this email" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const perms = {
      can_edit_schedule: permissions?.can_edit_schedule === true,
      can_view_checkins: permissions?.can_view_checkins !== false,
      can_use_ai_tutor: permissions?.can_use_ai_tutor === true,
      can_view_reports: permissions?.can_view_reports !== false,
      can_receive_sos: permissions?.can_receive_sos === true,
    };

    // Generate token + hash
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: invite, error: insertErr } = await admin
      .from("educator_invites")
      .insert({
        parent_id: user.id,
        student_id: student_id || null,
        invitee_email: email,
        permissions: perms,
        token_hash: tokenHash,
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    const siteUrl = "https://independentmindsedu.com";
    const inviteLink = `${siteUrl}/accept-educator-invite?token=${rawToken}`;
    const parentName = escapeHtml(user.user_metadata?.display_name || user.user_metadata?.full_name || "A parent");

    // Send email via Supabase auth invite
    const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        invite_type: "educator",
        parent_id: user.id,
        student_id: student_id || null,
        invite_token: rawToken,
        display_name: email.split("@")[0],
        adult_confirmed: true,
        adult_confirmed_at: new Date().toISOString(),
        role: "parent",
      },
      redirectTo: inviteLink,
    });

    return new Response(JSON.stringify({
      success: true,
      invite_id: invite.id,
      invite_link: inviteLink,
      email_sent: !emailErr,
      message: !emailErr ? `Educator invitation sent to ${email}` : `Invite created. Share link: ${inviteLink}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("send-educator-invite error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
