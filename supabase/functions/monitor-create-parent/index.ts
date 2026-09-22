import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://www.independentmindsedu.org";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Only monitors (or admins, for support) may create a parent this way.
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["monitor", "admin"]);
    const callerRole = roleRows?.find(r => r.role === "monitor") ? "monitor" : roleRows?.find(r => r.role === "admin") ? "admin" : null;
    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Forbidden: monitor role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, display_name } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Same account-creation mechanism a normal signup uses: handle_new_user()
    // fires on the auth.users insert and creates profiles + a 'parent'
    // user_roles row automatically, as long as adult_confirmed is set.
    // generateLink (not inviteUserByEmail) so this doesn't hard-depend on
    // the project's mailer being correctly configured — it always returns
    // a usable action_link even if email sending itself fails, same
    // resilience pattern send-guardian-invite already relies on.
    const { data: linkData, error: inviteErr } = await admin.auth.admin.generateLink({
      type: "invite",
      email: normalizedEmail,
      options: {
        data: {
          adult_confirmed: true,
          display_name: display_name || normalizedEmail.split("@")[0],
          created_by_monitor: caller.id,
        },
        redirectTo: `${SITE_URL}/reset-password`,
      },
    });

    if (inviteErr || !linkData?.user) {
      return new Response(JSON.stringify({ error: inviteErr?.message || "Failed to create parent account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newParentId = linkData.user.id;
    const actionLink = linkData.properties?.action_link ?? null;

    // Marker-only subscriptions row (Part 2 will wire real billing/invoicing
    // for monitor-covered parents; status 'incomplete' already reads as
    // "not active" everywhere, same as a brand-new unpaid signup).
    const { error: subErr } = await admin.from("subscriptions").insert({
      user_id: newParentId,
      status: "incomplete",
      covered_by_monitor_id: caller.id,
    });
    if (subErr) {
      console.error("Failed to create marker subscription row:", subErr);
    }

    const { error: linkErr } = await admin.from("monitor_parents").insert({
      monitor_id: caller.id,
      parent_id: newParentId,
    });
    if (linkErr) {
      console.error("Failed to create monitor_parents link:", linkErr);
      return new Response(JSON.stringify({ error: "Parent account created but failed to link to monitor" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      parent_id: newParentId,
      email: normalizedEmail,
      invite_link: actionLink,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("monitor-create-parent error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
