import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Block {
  id: string;
  block_order: number;
  start_time: string;
  end_time: string;
  subject: string;
  status: string;
  self_rating: number | null;
  notes: string | null;
  time4learning_score: number | null;
  actual_start: string | null;
  actual_end: string | null;
  map_id: string | null;
}

export function useDailyBlocks(studentId: string | null, date?: string) {
  const planDate = date || new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["daily_blocks", studentId, planDate],
    queryFn: async (): Promise<Block[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("daily_plan")
        .select("*")
        .eq("student_id", studentId)
        .eq("plan_date", planDate)
        .order("block_order");
      if (error) throw error;
      return (data as Block[]) || [];
    },
    enabled: !!studentId,
  });
}

export function useRefreshBlocks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["daily_blocks"] });
}
