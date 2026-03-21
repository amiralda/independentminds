import { supabase } from "@/integrations/supabase/client";
import { getPointValue } from "@/hooks/usePointSettings";
import type { PointSetting } from "@/hooks/usePointSettings";

/**
 * Check if all tracks in the same category as the completed subject
 * have been done today, and award a category completion bonus if so.
 */
export async function checkAndAwardCategoryBonus(
  studentId: string,
  completedSubject: string,
  pointSettings: PointSetting[] = []
) {
  const today = new Date().toISOString().split("T")[0];

  // Get the category for this subject from subject_tracks
  const { data: matchingTrack } = await supabase
    .from("subject_tracks")
    .select("category")
    .eq("student_id", studentId)
    .ilike("name", completedSubject)
    .limit(1);

  if (!matchingTrack || matchingTrack.length === 0) return;
  const category = matchingTrack[0].category;

  // Get all enabled tracks in this category
  const { data: categoryTracks } = await supabase
    .from("subject_tracks")
    .select("name")
    .eq("student_id", studentId)
    .eq("category", category)
    .eq("enabled", true);

  if (!categoryTracks || categoryTracks.length < 2) return; // Need at least 2 tracks to matter

  // Get today's completed blocks
  const { data: todayBlocks } = await supabase
    .from("daily_plan")
    .select("subject, status")
    .eq("student_id", studentId)
    .eq("plan_date", today)
    .eq("status", "Done");

  if (!todayBlocks) return;

  const doneSubjects = new Set(todayBlocks.map(b => b.subject.toLowerCase()));

  // Check if all category tracks have at least one done block
  const allDone = categoryTracks.every(t => doneSubjects.has(t.name.toLowerCase()));
  if (!allDone) return;

  // Check if bonus already awarded today for this category
  const bonusSource = `category_complete_${category.toLowerCase().replace(/\s+/g, "_")}`;
  const { data: existing } = await supabase
    .from("reward_points")
    .select("id")
    .eq("student_id", studentId)
    .eq("source", bonusSource)
    .gte("created_at", today + "T00:00:00")
    .limit(1);

  if (existing && existing.length > 0) return; // Already awarded today

  const points = getPointValue(pointSettings, "category_complete");
  if (points <= 0) return;

  await supabase.rpc("award_points", {
    _student_id: studentId,
    _points: points,
    _reason: `🎯 ${category} — all subjects done!`,
    _source: bonusSource,
  });
}
