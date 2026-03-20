import { supabase } from "@/integrations/supabase/client";
import { POINT_VALUES } from "@/hooks/useRewards";
import { toast } from "sonner";

/**
 * Check consecutive-day streaks and award bonus points.
 * Looks back up to 7 days from today. Awards 3-day and 7-day bonuses
 * only if not already awarded for the current streak window.
 */
export async function checkAndAwardStreak(studentId: string) {
  // Get last 7 days of blocks
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  const { data: blocks } = await supabase
    .from("daily_plan")
    .select("plan_date, status")
    .eq("student_id", studentId)
    .in("plan_date", dates)
    .eq("status", "Done");

  if (!blocks) return;

  const daysWithDone = new Set(blocks.map(b => b.plan_date));

  // Count consecutive days starting from today going backwards
  let streak = 0;
  for (const date of dates) {
    if (daysWithDone.has(date)) streak++;
    else break;
  }

  if (streak < 3) return;

  // Check what streak bonuses were already awarded this week
  const weekAgo = dates[6]; // 7 days ago
  const { data: existing } = await supabase
    .from("reward_points")
    .select("source")
    .eq("student_id", studentId)
    .in("source", ["streak_3_day", "streak_7_day"])
    .gte("created_at", weekAgo + "T00:00:00");

  const awarded = new Set((existing || []).map(e => e.source));

  // Award 3-day streak
  if (streak >= 3 && !awarded.has("streak_3_day")) {
    await supabase.rpc("award_points", {
      _student_id: studentId,
      _points: POINT_VALUES.STREAK_3_DAYS,
      _reason: "🔥 3-Day Streak Bonus!",
      _source: "streak_3_day",
    });
    toast.success(`🔥 3-Day Streak! +${POINT_VALUES.STREAK_3_DAYS} points`);
  }

  // Award 7-day streak
  if (streak >= 7 && !awarded.has("streak_7_day")) {
    await supabase.rpc("award_points", {
      _student_id: studentId,
      _points: POINT_VALUES.STREAK_7_DAYS,
      _reason: "🏆 7-Day Streak Bonus!",
      _source: "streak_7_day",
    });
    toast.success(`🏆 7-Day Streak! +${POINT_VALUES.STREAK_7_DAYS} points`);
  }
}
