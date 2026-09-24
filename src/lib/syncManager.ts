import { supabase } from "@/integrations/supabase/client";
import { getPendingActions, removeAction, incrementRetry } from "./offlineQueue";
import { toCheckInRow } from "@/hooks/useSubmitCheckIn";

const MAX_RETRIES = 3;

export async function syncPendingActions(): Promise<{ synced: number; failed: number }> {
  const actions = await getPendingActions();
  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    if (action.retryCount >= MAX_RETRIES) {
      await removeAction(action.id!);
      failed++;
      continue;
    }

    try {
      if (action.type === "COMPLETE_BLOCK") {
        const p = action.payload;
        // Points are awarded by the award_task_points trigger.
        const { error } = await supabase.from("daily_plan").update({
          status: "done",
          actual_end: p.actual_end as string,
        }).eq("id", p.block_id as string);
        if (error) throw error;
      } else if (action.type === "SUBMIT_CHECKIN") {
        const p = action.payload;
        const { error } = await supabase.from("check_ins").insert(toCheckInRow({
          student_id: p.student_id as string,
          mood: p.mood as string,
          focus: p.focus as string,
          blocks_done: p.blocks_done as number,
          need_help: p.need_help as boolean,
          comment: p.comment as string | null,
        }));
        if (error) throw error;
      }

      await removeAction(action.id!);
      synced++;
    } catch {
      await incrementRetry(action.id!);
      failed++;
    }
  }

  return { synced, failed };
}
