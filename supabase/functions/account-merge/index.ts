import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller is an admin (parent role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role via SECURITY DEFINER RPC (consistent with other admin functions)
    const adminClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const { data: isAdmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, merge_request_id, admin_notes } = await req.json();

    if (action === "list") {
      // List all pending merge requests (admin only - uses service role)
      const { data, error } = await adminClient
        .from("merge_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ requests: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve" && merge_request_id) {
      // Get the merge request
      const { data: mergeReq, error: mrErr } = await adminClient
        .from("merge_requests")
        .select("*")
        .eq("id", merge_request_id)
        .single();
      if (mrErr || !mergeReq) throw new Error("Merge request not found");
      if (mergeReq.status !== "pending") throw new Error("Already processed");

      // Find source user by email
      const { data: { users }, error: usersErr } = await adminClient.auth.admin.listUsers();
      if (usersErr) throw usersErr;
      const sourceUser = users.find((u: unknown) => u.email === mergeReq.source_email);
      if (!sourceUser) throw new Error(`Source user ${mergeReq.source_email} not found`);

      const sourceUserId = sourceUser.id;
      const targetUserId = mergeReq.requester_id;

      // Transfer students from source to target
      const { error: transferErr } = await adminClient
        .from("students")
        .update({ parent_id: targetUserId })
        .eq("parent_id", sourceUserId);
      if (transferErr) throw transferErr;

      // Transfer parent_settings
      await adminClient
        .from("parent_settings")
        .update({ user_id: targetUserId })
        .eq("user_id", sourceUserId);

      // Transfer schedule_templates
      await adminClient
        .from("schedule_templates")
        .update({ parent_id: targetUserId })
        .eq("parent_id", sourceUserId);

      // Transfer curriculum_map
      await adminClient
        .from("curriculum_map")
        .update({ user_id: targetUserId })
        .eq("user_id", sourceUserId);

      // Mark merge request as approved
      await adminClient
        .from("merge_requests")
        .update({
          status: "approved",
          resolved_at: new Date().toISOString(),
          admin_notes: admin_notes || "Approved and merged",
        })
        .eq("id", merge_request_id);

      return new Response(JSON.stringify({ success: true, message: "Accounts merged" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject" && merge_request_id) {
      await adminClient
        .from("merge_requests")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
          admin_notes: admin_notes || "Rejected",
        })
        .eq("id", merge_request_id);

      return new Response(JSON.stringify({ success: true, message: "Request rejected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("account-merge error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
