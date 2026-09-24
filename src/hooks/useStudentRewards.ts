import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StudentRewards {
  totalPoints: number;
  badges: { badge_type: string; earned_at: string | null }[];
}

/** Lifetime points earned + badges for one student (RLS: the student, or their family). */
export function useStudentRewards(studentId: string | null) {
  return useQuery({
    queryKey: ["student_rewards", studentId],
    queryFn: async (): Promise<StudentRewards> => {
      if (!studentId) return { totalPoints: 0, badges: [] };
      const [pointsRes, badgesRes] = await Promise.all([
        supabase.from("reward_points").select("points").eq("student_id", studentId).gt("points", 0),
        supabase.from("achievements").select("badge_type, earned_at").eq("student_id", studentId).order("earned_at"),
      ]);
      if (pointsRes.error) throw pointsRes.error;
      if (badgesRes.error) throw badgesRes.error;
      return {
        totalPoints: (pointsRes.data || []).reduce((sum, r) => sum + (r.points || 0), 0),
        badges: (badgesRes.data || []) as StudentRewards["badges"],
      };
    },
    enabled: !!studentId,
  });
}
