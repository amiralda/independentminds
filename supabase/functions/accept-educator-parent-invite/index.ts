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

    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Find the invite
    const { data: invite, error: findErr } = await admin
      .from("educator_parent_invites")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("status", "pending")
      .single();

    if (findErr || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found or already used" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This invite has expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign parent to student
    const { error: updateErr } = await admin
      .from("students")
      .update({ parent_id: user.id })
      .eq("student_id", invite.student_id)
      .is("parent_id", null);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Could not assign parent. Student may already have a parent." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure user has parent role
    await admin.from("user_roles").upsert(
      { user_id: user.id, role: "parent" },
      { onConflict: "user_id,role" }
    );

    // Ensure profile role is parent
    await admin
      .from("profiles")
      .update({ role: "parent" })
      .eq("id", user.id);

    // Mark invite accepted
    await admin
      .from("educator_parent_invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    return new Response(JSON.stringify({
      success: true,
      student_id: invite.student_id,
      message: "You are now the parent of this student!",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    console.error("accept-educator-parent-invite error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
