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

    const { student_id, parent_email } = await req.json();
    if (!student_id || !parent_email) {
      return new Response(JSON.stringify({ error: "Missing student_id or parent_email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = parent_email.trim().toLowerCase();
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Verify caller is an educator with access to this student
    const { data: educator } = await admin
      .from("educators")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!educator) {
      return new Response(JSON.stringify({ error: "You are not an educator" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: assignment } = await admin
      .from("educator_students")
      .select("id")
      .eq("educator_id", educator.id)
      .eq("student_id", student_id)
      .maybeSingle();

    if (!assignment) {
      return new Response(JSON.stringify({ error: "You don't have access to this student" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check student doesn't already have a parent
    const { data: student } = await admin
      .from("students")
      .select("parent_id, display_name")
      .eq("student_id", student_id)
      .single();

    if (!student) {
      return new Response(JSON.stringify({ error: "Student not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (student.parent_id) {
      return new Response(JSON.stringify({ error: "This student already has a parent assigned" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing pending invite
    const { data: existing } = await admin
      .from("educator_parent_invites")
      .select("id")
      .eq("educator_id", educator.id)
      .eq("student_id", student_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "An invite is already pending for this student" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate token
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const rawToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: invite, error: insertErr } = await admin
      .from("educator_parent_invites")
      .insert({
        educator_id: educator.id,
        student_id,
        parent_email: email,
        token_hash: tokenHash,
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    const siteUrl = "https://www.independentmindsedu.org";
    const inviteLink = `${siteUrl}/accept-educator-parent-invite?token=${rawToken}`;
    const educatorName = escapeHtml(
      user.user_metadata?.display_name || user.user_metadata?.full_name || "An educator"
    );
    const studentName = escapeHtml(student.display_name || student_id);

    // Send email via Supabase auth invite
    const { error: emailErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        invite_type: "educator_parent",
        educator_id: educator.id,
        student_id,
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
      message: !emailErr
        ? `Parent invitation sent to ${email}`
        : `Invite created. Share link: ${inviteLink}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("send-educator-parent-invite error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
