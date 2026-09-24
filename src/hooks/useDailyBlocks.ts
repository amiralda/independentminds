import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_COLUMNS, toPlanBlocks, type DailyPlanDbRow, type PlanBlock } from "@/lib/dailyPlan";

export type Block = PlanBlock;

export function useDailyBlocks(studentId: string | null, date?: string) {
  const planDate = date || new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["daily_blocks", studentId, planDate],
    queryFn: async (): Promise<Block[]> => {
      if (!studentId) return [];
      // Real columns only -- the old plan_date/block_order query was a 400
      // on every load, so no blocks (and no Done button) ever rendered.
      const { data, error } = await supabase
        .from("daily_plan")
        .select(PLAN_COLUMNS)
        .eq("student_id", studentId)
        .eq("planned_date", planDate);
      if (error) throw error;
      return toPlanBlocks((data as DailyPlanDbRow[]) || []);
    },
    enabled: !!studentId,
  });
}

export function useRefreshBlocks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["daily_blocks"] });
}
