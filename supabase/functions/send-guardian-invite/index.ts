import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://www.independentmindsedu.org";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Creates (or reuses) a co-guardian invite for the caller's family and returns
// a link for the parent to copy -- no automatic email (Auth email is rate
// limited). Only the primary parent (owns at least one student) may invite.
// The invite is family-level: once accepted, the co-guardian has the same
// access as the parent (get_managed_parent_ids).
//  - Email already has an account that has signed in: link = /accept-invite.
//  - No account yet (or never signed in): a set-password link that lands on
//    /accept-invite afterwards.
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
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: "Unauthorized: invalid session" }, 401);

    const { email } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return json({ error: "A valid email is required", code: "invalid_email" }, 400);
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === (caller.email || "").toLowerCase()) {
      return json({ error: "You cannot invite yourself", code: "self_invite" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Primary parent only: must own at least one student.
    const { count: ownStudents } = await admin
      .from("students").select("id", { count: "exact", head: true }).eq("parent_id", caller.id);
    if (!ownStudents) {
      return json({ error: "Only the primary parent can invite co-guardians", code: "not_primary_parent" }, 403);
    }

    const { data: existingUserId } = await admin.rpc("find_auth_user_id_by_email", { p_email: normalizedEmail });
    let hasSignedIn = false;
    if (existingUserId) {
      const { data: already } = await admin
        .from("co_guardians").select("id").eq("parent_id", caller.id).eq("guardian_id", existingUserId).maybeSingle();
      if (already) return json({ error: "This person is already a co-guardian", code: "already_guardian" }, 409);
      const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", existingUserId);
      const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
      if (roles.includes("student") && !roles.includes("parent")) {
        return json({ error: "A student account cannot be a co-guardian", code: "student_account" }, 400);
      }
      const { data: existingUser } = await admin.auth.admin.getUserById(existingUserId);
      hasSignedIn = !!existingUser?.user?.last_sign_in_at;
    }

    // Reuse the pending invite for this email if it is still valid.
    const nowIso = new Date().toISOString();
    const { data: pending } = await admin
      .from("guardian_invites")
      .select("id, token, expires_at")
      .eq("parent_id", caller.id)
      .eq("email", normalizedEmail) // stored lowercased; ilike would treat "_" as a wildcard
      .eq("status", "pending")
      .maybeSingle();
    let invite = pending;
    if (invite && invite.expires_at && invite.expires_at < nowIso) {
      await admin.from("guardian_invites").update({ status: "expired" }).eq("id", invite.id);
      invite = null;
    }
    if (!invite) {
      const { data: created, error: insertErr } = await admin
        .from("guardian_invites")
        .insert({ parent_id: caller.id, email: normalizedEmail })
        .select("id, token, expires_at")
        .single();
      if (insertErr || !created) {
        console.error("send-guardian-invite: insert failed", insertErr);
        return json({ error: "Could not create the invite" }, 500);
      }
      invite = created;
    }

    const acceptPath = `/accept-invite?token=${invite.token}`;
    let link = `${SITE_URL}${acceptPath}`;
    let needsPassword = false;

    if (!hasSignedIn) {
      // New account (or one that never set a password): set a password first,
      // then continue to the accept page.
      needsPassword = true;
      const redirectTo = `${SITE_URL}/reset-password?next=${encodeURIComponent(acceptPath)}`;
      const { data: linkData, error: linkErr } = existingUserId
        ? await admin.auth.admin.generateLink({ type: "recovery", email: normalizedEmail, options: { redirectTo } })
        : await admin.auth.admin.generateLink({
          type: "invite",
          email: normalizedEmail,
          options: {
            // Server-set (never client metadata): the co-guardian is an adult
            // invited by the parent; handle_new_user gives the 'parent' role.
            data: { adult_confirmed: true, display_name: normalizedEmail.split("@")[0] },
            redirectTo,
          },
        });
      if (linkErr || !linkData?.properties?.action_link) {
        console.error("send-guardian-invite: generateLink failed", linkErr);
        return json({ error: "Could not create the invite link" }, 500);
      }
      link = linkData.properties.action_link;
    }

    return json({
      success: true,
      invite_id: invite.id,
      email: normalizedEmail,
      expires_at: invite.expires_at,
      needs_password: needsPassword,
      invite_link: link,
    }, 200);
  } catch (err) {
    console.error("send-guardian-invite error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
