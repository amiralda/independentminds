import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CheckInData {
  student_id: string;
  mood: string;
  focus: string;
  blocks_done: number;
  need_help: boolean;
  comment: string | null;
}

export function useSubmitCheckIn(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CheckInData) => {
      const { error } = await supabase.from("check_ins").insert(data);
      if (error) throw error;

      // If help is needed, trigger urgent parent alert
      if (data.need_help) {
        try {
          await supabase.functions.invoke("parent-alerts", {
            body: {
              type: "help_needed",
              student_id: data.student_id,
              comment: data.comment || "No comment provided",
              focus: data.focus,
              mood: data.mood,
            },
          });
        } catch (e) {
          console.error("Failed to send help alert:", e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily_blocks"] });
      onSuccess?.();
    },
    onError: () => {
      toast.error("Error submitting check-in");
    },
  });
}
