import { supabase } from "@/integrations/supabase/client";
import { getPendingActions, removeAction, incrementRetry } from "./offlineQueue";

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
        const { error } = await supabase.from("daily_plan").update({
          status: "Done",
          actual_end: p.actual_end as string,
          self_rating: p.self_rating as number,
          time4learning_score: p.time4learning_score as number | null,
          notes: p.notes as string | null,
        }).eq("id", p.block_id as string);
        if (error) throw error;

        // Award points via RPC
        if (p.student_id) {
          await supabase.rpc("award_points", {
            _student_id: p.student_id as string,
            _points: 10,
            _reason: `Completed: ${p.subject || "block"}`,
            _source: "block_complete",
            _reference_id: p.block_id as string,
          });
        }
      } else if (action.type === "SUBMIT_CHECKIN") {
        const p = action.payload;
        const { error } = await supabase.from("check_ins").insert({
          student_id: p.student_id as string,
          mood: p.mood as string,
          focus: p.focus as string,
          blocks_done: p.blocks_done as number,
          need_help: p.need_help as boolean,
          comment: p.comment as string | null,
        });
        if (error) throw error;

        await supabase.rpc("award_points", {
          _student_id: p.student_id as string,
          _points: 5,
          _reason: `Check-in completed (${p.mood})`,
          _source: "check_in",
        });
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
