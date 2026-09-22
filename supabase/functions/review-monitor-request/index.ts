import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Admin-only.
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id, decision } = await req.json();
    if (!request_id || !["approved", "rejected"].includes(decision)) {
      return new Response(JSON.stringify({ error: "Missing request_id or invalid decision" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: reqRow, error: fetchErr } = await admin
      .from("monitor_requests")
      .select("id, user_id, status")
      .eq("id", request_id)
      .maybeSingle();
    if (fetchErr || !reqRow) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (reqRow.status !== "pending") {
      return new Response(JSON.stringify({ error: `Request already ${reqRow.status}` }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await admin
      .from("monitor_requests")
      .update({ status: decision, reviewed_by: caller.id, reviewed_at: new Date().toISOString() })
      .eq("id", request_id);
    if (updateErr) {
      console.error("Failed to update monitor_requests:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update request" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (decision === "approved") {
      // Additive: same mechanism as a manual admin grant, never replaces
      // any role the requester already has.
      const { error: roleErr } = await admin
        .from("user_roles")
        .upsert({ user_id: reqRow.user_id, role: "monitor" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleErr) {
        console.error("Failed to grant monitor role:", roleErr);
        return new Response(JSON.stringify({ error: "Request marked approved but failed to grant monitor role" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, request_id, decision }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("review-monitor-request error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
