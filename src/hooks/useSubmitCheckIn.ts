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

// check_ins' real columns: mood ('focused'|'okay'|'struggling'),
// focus/progress (1-5), help_needed, note. The form's values are mapped here.
const MOOD_TO_DB: Record<string, string> = { Good: "focused", Okay: "okay", Tired: "struggling" };
const FOCUS_TO_DB: Record<string, number> = { High: 5, Medium: 3, Low: 1 };

export function toCheckInRow(data: CheckInData) {
  return {
    student_id: data.student_id,
    mood: MOOD_TO_DB[data.mood] ?? "okay",
    focus: FOCUS_TO_DB[data.focus] ?? 3,
    help_needed: !!data.need_help,
    note: data.comment || null,
  };
}

export function useSubmitCheckIn(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CheckInData) => {
      // checked_in_at is stamped server-side; the "Fidèl" badge
      // (7 consecutive days) is awarded by the award_checkin_badges trigger.
      const { error } = await supabase.from("check_ins").insert(toCheckInRow(data));
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
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      queryClient.invalidateQueries({ queryKey: ["student_rewards"] });
      onSuccess?.();
    },
    onError: () => {
      toast.error("Error submitting check-in");
    },
  });
}
