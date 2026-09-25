import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Accepts a co-guardian invite for the signed-in user. Only the invited email
// may accept. Creates the family-level co_guardians row (full access: same as
// the parent, via get_managed_parent_ids) -- the only way such a row is made.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized: missing token" }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized: invalid session" }, 401);

    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") return json({ error: "Missing token", code: "invalid_token" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: invite } = await admin
      .from("guardian_invites")
      .select("id, parent_id, email, status, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (!invite) return json({ error: "Invalid invite link", code: "invalid_token" }, 404);
    if (invite.status === "accepted") return json({ error: "This invite was already used", code: "used" }, 409);
    if (invite.status === "revoked") return json({ error: "This invite was cancelled", code: "revoked" }, 410);
    if (invite.status === "expired" || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
      if (invite.status === "pending") await admin.from("guardian_invites").update({ status: "expired" }).eq("id", invite.id);
      return json({ error: "This invite has expired", code: "expired" }, 410);
    }

    if ((user.email || "").toLowerCase() !== invite.email.toLowerCase()) {
      return json({ error: "This invite was sent to a different email", code: "email_mismatch" }, 403);
    }
    if (user.id === invite.parent_id) return json({ error: "You cannot accept your own invite", code: "own_invite" }, 400);

    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    if (roles.includes("student") && !roles.includes("parent")) {
      return json({ error: "A student account cannot be a co-guardian", code: "student_account" }, 403);
    }

    const { error: cgErr } = await admin.from("co_guardians").upsert({
      parent_id: invite.parent_id,
      guardian_id: user.id,
      can_view_progress: true,
      can_receive_sos: true,
      can_approve_rewards: true,
      can_edit_lessons: true,
      is_full_access: true,
    }, { onConflict: "parent_id,guardian_id", ignoreDuplicates: true });
    if (cgErr) {
      console.error("accept-guardian-invite: co_guardians insert failed", cgErr);
      return json({ error: "Could not accept the invite" }, 500);
    }

    // The dashboard is the parent dashboard: make sure the role is there.
    if (!roles.includes("parent")) {
      await admin.from("user_roles").upsert({ user_id: user.id, role: "parent" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    }

    await admin.from("guardian_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("id", invite.id);

    const { count } = await admin
      .from("students").select("id", { count: "exact", head: true }).eq("parent_id", invite.parent_id);

    return json({ success: true, parent_id: invite.parent_id, students_count: count ?? 0 }, 200);
  } catch (err) {
    console.error("accept-guardian-invite error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
