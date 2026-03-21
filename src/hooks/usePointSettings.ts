import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { POINT_VALUES } from "@/hooks/useRewards";

export interface PointSetting {
  id: string;
  student_id: string;
  action_key: string;
  points: number;
  enabled: boolean;
}

// Default action keys with labels
export const ACTION_KEYS = [
  { key: "block_complete", label: "Block Completed", labelHT: "Blòk Fini", default: POINT_VALUES.BLOCK_COMPLETED },
  { key: "check_in", label: "Check-In", labelHT: "Tcheke", default: POINT_VALUES.CHECK_IN },
  { key: "perfect_day", label: "Perfect Day", labelHT: "Jou Pafè", default: POINT_VALUES.PERFECT_DAY },
  { key: "streak_3_day", label: "3-Day Streak", labelHT: "Seri 3 Jou", default: POINT_VALUES.STREAK_3_DAYS },
  { key: "streak_7_day", label: "7-Day Streak", labelHT: "Seri 7 Jou", default: POINT_VALUES.STREAK_7_DAYS },
  { key: "high_rating", label: "5/5 Rating", labelHT: "Nòt 5/5", default: POINT_VALUES.HIGH_RATING },
  { key: "category_complete", label: "Category Complete", labelHT: "Kategori Fini", default: 25 },
] as const;

export function usePointSettings(studentId: string | null) {
  return useQuery({
    queryKey: ["point_settings", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("point_settings")
        .select("*")
        .eq("student_id", studentId);
      if (error) throw error;
      return (data || []) as unknown as PointSetting[];
    },
    enabled: !!studentId,
  });
}

/** Get effective point value for an action, falling back to defaults */
export function getPointValue(settings: PointSetting[], actionKey: string): number {
  const setting = settings.find(s => s.action_key === actionKey);
  if (setting) return setting.enabled ? setting.points : 0;
  const def = ACTION_KEYS.find(a => a.key === actionKey);
  return def?.default ?? 10;
}

export function useSavePointSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { student_id: string; action_key: string; points: number; enabled: boolean }) => {
      const { error } = await supabase
        .from("point_settings")
        .upsert({
          student_id: params.student_id,
          action_key: params.action_key,
          points: params.points,
          enabled: params.enabled,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "student_id,action_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["point_settings"] });
    },
  });
}
