import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAST_DUE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
function withinPastDueGrace(periodEnd: string | null): boolean {
  if (!periodEnd) return false;
  const periodEndMs = new Date(periodEnd).getTime();
  if (!Number.isFinite(periodEndMs)) return false;
  return Date.now() <= periodEndMs + PAST_DUE_GRACE_MS;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { studentId, startDate, endDate, status } = await req.json();
    if (!studentId || typeof studentId !== "string") {
      return new Response(JSON.stringify({ error: "Missing studentId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership check: the caller must manage this student's family (parent,
    // Manager or co-guardian -- get_managed_parent_ids).
    const [{ data: ownedStudent }, { data: managedIds }] = await Promise.all([
      serviceClient.from("students").select("id, parent_id").eq("id", studentId).maybeSingle(),
      serviceClient.rpc("get_managed_parent_ids", { _uid: userId }),
    ]);
    if (!ownedStudent || !((managedIds as string[] | null) ?? []).includes(ownedStudent.parent_id)) {
      return new Response(JSON.stringify({ error: "Forbidden: student access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Subscription gate on the family's subscription -- mirrors
    // useSubscription.ts's isActive logic (trialing/active, or past_due within
    // a 7-day grace period).
    const { data: subRow } = await serviceClient
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", ownedStudent.parent_id)
      .maybeSingle();

    const subStatus = subRow?.status;
    const hasGrace = subStatus === "past_due" && withinPastDueGrace(subRow?.current_period_end ?? null);
    const isActive = subStatus === "trialing" || subStatus === "active" || hasGrace;

    if (!isActive) {
      return new Response(JSON.stringify({
        error: "subscription_required",
        message: "An active subscription is required to view progress reports.",
        message_ht: "Ou bezwen yon abònman aktif pou wè rapò pwogrè yo.",
      }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dayStart = (d: string) => `${d}T00:00:00`;
    const dayEnd = (d: string) => `${d}T23:59:59`;
    // daily_plan.status is stored lowercase ('planned' | 'started' | 'done');
    // older clients send "Done".
    const statusFilter = typeof status === "string" && status ? status.toLowerCase() : null;

    let dailyPlanQuery = serviceClient
      .from("daily_plan")
      .select("planned_date, status, subject")
      .eq("student_id", studentId);
    if (startDate) dailyPlanQuery = dailyPlanQuery.gte("planned_date", startDate);
    if (endDate) dailyPlanQuery = dailyPlanQuery.lte("planned_date", endDate);
    if (statusFilter) dailyPlanQuery = dailyPlanQuery.eq("status", statusFilter);

    let checkInsQuery = serviceClient
      .from("check_ins")
      .select("checked_in_at, mood, focus")
      .eq("student_id", studentId);
    if (startDate) checkInsQuery = checkInsQuery.gte("checked_in_at", dayStart(startDate));
    if (endDate) checkInsQuery = checkInsQuery.lte("checked_in_at", dayEnd(endDate));

    let achievementsQuery = serviceClient
      .from("achievements")
      .select("badge_type, milestone, earned_at")
      .eq("student_id", studentId);
    if (startDate) achievementsQuery = achievementsQuery.gte("earned_at", dayStart(startDate));
    if (endDate) achievementsQuery = achievementsQuery.lte("earned_at", dayEnd(endDate));

    let rewardPointsQuery = serviceClient
      .from("reward_points")
      .select("points, source, awarded_at")
      .eq("student_id", studentId);
    if (startDate) rewardPointsQuery = rewardPointsQuery.gte("awarded_at", dayStart(startDate));
    if (endDate) rewardPointsQuery = rewardPointsQuery.lte("awarded_at", dayEnd(endDate));

    const [dailyPlanRes, checkInsRes, achievementsRes, rewardPointsRes] = await Promise.all([
      dailyPlanQuery.order("planned_date"),
      checkInsQuery.order("checked_in_at"),
      achievementsQuery.order("earned_at"),
      rewardPointsQuery.order("awarded_at"),
    ]);

    // A failed query used to come back as an empty section; surface it instead.
    const failed = [dailyPlanRes, checkInsRes, achievementsRes, rewardPointsRes].find((r) => r.error);
    if (failed?.error) {
      console.error("weekly-report-data query error:", failed.error);
      return new Response(JSON.stringify({ error: "Could not load the report." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      daily_plan: dailyPlanRes.data || [],
      check_ins: checkInsRes.data || [],
      achievements: achievementsRes.data || [],
      reward_points: rewardPointsRes.data || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-report-data error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
