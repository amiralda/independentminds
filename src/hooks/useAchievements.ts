import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { badgeDef, badgeLabelKey } from "@/lib/badges";
import { useI18n } from "@/lib/i18n";

export interface Achievement {
  id: string;
  student_id: string;
  type: string;
  name: string;
  description: string | null;
  criteria_met_at: string;
  image_url: string | null;
  created_at: string;
}

interface AchievementRow {
  id: string;
  student_id: string | null;
  badge_type: string;
  milestone: number | null;
  earned_at: string | null;
}

// achievements' real columns are badge_type/milestone/earned_at; badges are
// awarded server-side only (award_point_badges / award_checkin_badges).
// Rows are mapped to the shape TrophyRoom/CertificatesPanel already render.
export function useAchievements(studentId: string | null) {
  const { t } = useI18n();
  return useQuery({
    queryKey: ["achievements", studentId],
    queryFn: async (): Promise<AchievementRow[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("achievements")
        .select("id, student_id, badge_type, milestone, earned_at")
        .eq("student_id", studentId)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return (data as AchievementRow[]) || [];
    },
    select: (rows): Achievement[] =>
      rows.map((a) => {
        const def = badgeDef(a.badge_type);
        return {
          id: a.id,
          student_id: a.student_id || studentId || "",
          type: "badge",
          name: `${def?.emoji ?? "🏅"} ${t(badgeLabelKey(a.badge_type))}`,
          description: a.milestone != null ? String(a.milestone) : null,
          criteria_met_at: a.earned_at || "",
          image_url: null,
          created_at: a.earned_at || "",
        };
      }),
    enabled: !!studentId,
  });
}
