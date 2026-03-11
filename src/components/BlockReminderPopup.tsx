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
        toast.info(
          `📋 You have ${blocks.length} block${blocks.length > 1 ? "s" : ""} still marked as Planned today. Did you finish any? Go to Today and mark them as Done!`,
          { duration: 10000 }
        );
      }
    };

    // Check shortly after mount (5s delay to not block initial load)
    const initialTimeout = setTimeout(checkAndRemind, 5000);

    // Then check every 30 min (will only show if 4h passed since last reminder)
    timerRef.current = setInterval(checkAndRemind, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [studentId]);

  return null;
}
