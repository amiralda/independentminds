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

    const { student_id, invitee_email, permissions } = await req.json();
    if (!student_id || !invitee_email) {
      return new Response(JSON.stringify({ error: "Missing student_id or invitee_email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = invitee_email.trim().toLowerCase();

    // Service role client for privileged operations
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Verify caller is the primary parent of this student
    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("parent_id, display_name")
      .eq("student_id", student_id)
      .single();

    if (studentErr || !student || student.parent_id !== user.id) {
      return new Response(JSON.stringify({ error: "You are not the primary parent of this student" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing pending invite
    const { data: existing } = await admin
      .from("guardian_invites")
      .select("id")
      .eq("student_id", student_id)
      .eq("invitee_email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "An invite is already pending for this email" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build permissions object from request (with safe defaults)
    const perms = {
      can_view_progress: true, // always true
      can_receive_sos: permissions?.can_receive_sos === true,
      can_approve_rewards: permissions?.can_approve_rewards === true,
      can_edit_lessons: permissions?.can_edit_lessons === true,
      is_full_access: permissions?.is_full_access === true,
    };

    // If full access, enable all
    if (perms.is_full_access) {
      perms.can_receive_sos = true;
      perms.can_approve_rewards = true;
      perms.can_edit_lessons = true;
    }

    // Generate token and compute SHA-256 hash
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Insert invite with hashed token (raw token never stored)
    const { data: invite, error: insertErr } = await admin
      .from("guardian_invites")
      .insert({
        student_id,
        invited_by: user.id,
        invitee_email: email,
        permissions: perms,
        token: "REDACTED",
        token_hash: tokenHash,
      } as any)
      .select("id")
      .single();

    if (insertErr) {
      throw insertErr;
    }

    // Build invite link
    const siteUrl = "https://independentminds.lovable.app";
    const inviteLink = `${siteUrl}/accept-invite?token=${rawToken}`;

    const parentName = user.user_metadata?.display_name || "A parent";
    const studentName = escapeHtml(student.display_name);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;padding:40px;border:1px solid #e4e4e7;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#1F3B73;font-size:22px;margin:0;">Independent Minds EDU</h1>
    </div>
    <h2 style="color:#1a1a1a;font-size:18px;">You've been invited as a Co-Guardian</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      <strong>${escapeHtml(parentName)}</strong> has invited you to co-manage
      <strong>${studentName}</strong>'s academic journey on Independent Minds EDU.
    </p>
    <p style="color:#555;font-size:15px;line-height:1.6;">
      Click the button below to accept the invitation and get access to ${studentName}'s profile.
      This link expires in 7 days.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${inviteLink}" style="background-color:#1F3B73;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
        Accept Invitation
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="color:#999;font-size:12px;text-align:center;">
      Independent Minds EDU v2.0 — Built with Love by KòdLabo
    </p>
  </div>
</body>
</html>`;

    // Send invite email — set role to parent so the new user gets the right role
    const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        invite_type: "co_guardian",
        student_id,
        invite_token: invite.token,
        display_name: email.split("@")[0],
        role: "parent",
      },
      redirectTo: inviteLink,
    });

    const emailSent = !emailErr;

    return new Response(JSON.stringify({
      success: true,
      invite_id: invite.id,
      invite_link: inviteLink,
      email_sent: emailSent,
      message: emailSent
        ? `Invitation sent to ${email}`
        : `Invite created. Share this link with ${email}: ${inviteLink}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-guardian-invite error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
