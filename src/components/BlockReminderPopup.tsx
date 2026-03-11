import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const REMINDER_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const STORAGE_KEY = "im_last_block_reminder";

interface Props {
  studentId: string | null;
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
        .select("id, subject, status")
        .eq("student_id", studentId)
        .eq("plan_date", today)
        .eq("status", "Planned");

      if (blocks && blocks.length > 0) {
        localStorage.setItem(STORAGE_KEY, now.toString());
        const subjects = blocks.slice(0, 3).map(b => b.subject).join(", ");
        const more = blocks.length > 3 ? ` and ${blocks.length - 3} more` : "";
        toast(
          "⏰ Hey! Did you finish any blocks?",
          {
            description: `You have ${blocks.length} block${blocks.length > 1 ? "s" : ""} still marked as Planned (${subjects}${more}). If you already completed them, tap each one and mark it as Done so your progress counts! 💪`,
            duration: 15000,
            action: {
              label: "Got it!",
              onClick: () => {},
            },
          }
        );
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
