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

    // Subscription gate — mirrors useSubscription.ts's isActive logic exactly
    // (trialing/active, or past_due within a 7-day grace period).
    const { data: subRow } = await serviceClient
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
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

    const { studentId, startDate, endDate, status } = await req.json();
    if (!studentId || typeof studentId !== "string") {
      return new Response(JSON.stringify({ error: "Missing studentId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership check: the caller must be this student's parent.
    const { data: ownedStudent } = await serviceClient
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("parent_id", userId)
      .maybeSingle();
    if (!ownedStudent) {
      return new Response(JSON.stringify({ error: "Forbidden: student access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dayStart = (d: string) => `${d}T00:00:00`;
    const dayEnd = (d: string) => `${d}T23:59:59`;

    let dailyPlanQuery = serviceClient
      .from("daily_plan")
      .select("planned_date, status, subject")
      .eq("student_id", studentId);
    if (startDate) dailyPlanQuery = dailyPlanQuery.gte("planned_date", startDate);
    if (endDate) dailyPlanQuery = dailyPlanQuery.lte("planned_date", endDate);
    if (status) dailyPlanQuery = dailyPlanQuery.eq("status", status);

    let checkInsQuery = serviceClient
      .from("check_ins")
      .select("timestamp, mood, focus")
      .eq("student_id", studentId);
    if (startDate) checkInsQuery = checkInsQuery.gte("timestamp", dayStart(startDate));
    if (endDate) checkInsQuery = checkInsQuery.lte("timestamp", dayEnd(endDate));

    let achievementsQuery = serviceClient
      .from("achievements")
      .select("name, type, criteria_met_at")
      .eq("student_id", studentId);
    if (startDate) achievementsQuery = achievementsQuery.gte("criteria_met_at", dayStart(startDate));
    if (endDate) achievementsQuery = achievementsQuery.lte("criteria_met_at", dayEnd(endDate));

    let rewardPointsQuery = serviceClient
      .from("reward_points")
      .select("points")
      .eq("student_id", studentId);
    if (startDate) rewardPointsQuery = rewardPointsQuery.gte("created_at", dayStart(startDate));
    if (endDate) rewardPointsQuery = rewardPointsQuery.lte("created_at", dayEnd(endDate));

    const [dailyPlanRes, checkInsRes, achievementsRes, rewardPointsRes] = await Promise.all([
      dailyPlanQuery.order("planned_date"),
      checkInsQuery.order("timestamp"),
      achievementsQuery,
      rewardPointsQuery,
    ]);

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
