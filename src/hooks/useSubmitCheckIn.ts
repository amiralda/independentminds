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
