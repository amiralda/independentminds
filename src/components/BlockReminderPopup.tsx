import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const REMINDER_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const STORAGE_KEY = "im_last_block_reminder";

interface Props {
  studentId: string | null;
}

function getCurrentTimeStr() {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Port-au-Prince",
  });
}

export function BlockReminderPopup({ studentId }: Props) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!studentId) return;

    const checkAndRemind = async () => {
      const lastShown = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (lastShown && now - parseInt(lastShown) < REMINDER_INTERVAL) return;

      const today = new Date().toISOString().split("T")[0];
      const { data: blocks } = await supabase
        .from("daily_plan")
        .select("id, subject, status, start_time, end_time, block_order")
        .eq("student_id", studentId)
        .eq("plan_date", today)
        .order("block_order");

      if (!blocks || blocks.length === 0) return;

      const currentTime = getCurrentTimeStr(); // e.g. "10:35"

      // Find blocks whose end_time has passed but are still not Done
      const overdueBlocks = blocks.filter(
        (b) => b.status !== "Done" && b.end_time.slice(0, 5) <= currentTime
      );

      // Find the block he should currently be working on
      const currentBlock = blocks.find(
        (b) =>
          b.start_time.slice(0, 5) <= currentTime &&
          b.end_time.slice(0, 5) > currentTime
      );

      if (overdueBlocks.length === 0 && !currentBlock) return;

      localStorage.setItem(STORAGE_KEY, now.toString());

      let title = "";
      let description = "";

      if (currentBlock && currentBlock.status !== "Done") {
        // He should be working on this block right now
        title = `📚 Hey Chris! Are you working on ${currentBlock.subject}?`;
        description = `Your ${currentBlock.subject} block (${currentBlock.start_time.slice(0, 5)}–${currentBlock.end_time.slice(0, 5)}) is happening now.`;

        if (overdueBlocks.length > 0) {
          const overdueNames = overdueBlocks.map((b) => b.subject).join(", ");
          description += ` Also, did you already finish ${overdueNames}? If yes, mark ${overdueBlocks.length > 1 ? "them" : "it"} as Done! ✅`;
        } else {
          description += ` When you finish, don't forget to mark it as Done! ✅`;
        }
      } else if (overdueBlocks.length > 0) {
        // Past blocks not marked done
        const firstOverdue = overdueBlocks[0];
        if (overdueBlocks.length === 1) {
          title = `⏰ Did you finish ${firstOverdue.subject}?`;
          description = `Your ${firstOverdue.subject} block (${firstOverdue.start_time.slice(0, 5)}–${firstOverdue.end_time.slice(0, 5)}) should be done by now. If you completed it, tap it and mark as Done so your progress counts! 💪`;
        } else {
          const names = overdueBlocks.map((b) => b.subject).join(", ");
          title = `⏰ Chris, ${overdueBlocks.length} blocks need updating!`;
          description = `${names} — these blocks should be done by now. Did you complete them? Go mark them as Done so your stats are up to date! 💪`;
        }
      }

      if (title) {
        toast(title, {
          description,
          duration: 15000,
          action: {
            label: "Got it!",
            onClick: () => {},
          },
        });
      }
    };

    const initialTimeout = setTimeout(checkAndRemind, 5000);
    timerRef.current = setInterval(checkAndRemind, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [studentId]);

  return null;
}
