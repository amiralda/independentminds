import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Achievement {
  id: string;
  student_id: string;
  type: string;
  name: string;
  description: string | null;
  criteria_met_at: string;
  image_url: string | null;
  created_at: string;
}

export function useAchievements(studentId: string | null) {
  return useQuery({
    queryKey: ["achievements", studentId],
    queryFn: async (): Promise<Achievement[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("student_id", studentId)
        .order("criteria_met_at", { ascending: false });
      if (error) throw error;
      return (data as Achievement[]) || [];
    },
    enabled: !!studentId,
  });
}

export function useCheckAndAwardBadges(studentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      // Check daily: 20+ Done blocks today
      const { data: todayBlocks } = await supabase
        .from("daily_plan")
        .select("status")
        .eq("student_id", studentId)
        .eq("plan_date", today);

      const doneToday = todayBlocks?.filter(b => b.status === "Done").length || 0;

      if (doneToday >= 20) {
        // Check if already awarded today
        const { data: existing } = await supabase
          .from("achievements")
          .select("id")
          .eq("student_id", studentId)
          .eq("name", "20-Lesson Legend")
          .gte("criteria_met_at", today + "T00:00:00");

        if (!existing || existing.length === 0) {
          await supabase.from("achievements").insert({
            student_id: studentId,
            type: "badge",
            name: "20-Lesson Legend",
            description: "Completed 20+ lessons in a single day!",
          });

          // Trigger parent notification
          try {
            await supabase.functions.invoke("parent-alerts", {
              body: { type: "badge_earned", student_id: studentId, badge_name: "20-Lesson Legend" },
            });
          } catch (e) {
            console.error("Failed to send badge alert:", e);
          }
          toast.success("🏆 Badge Earned: 20-Lesson Legend!");
        }
      }

      // Check weekly: 120+ Done blocks this week (Mon-Sat)
      const now = new Date();
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 6) { // Saturday
        const monday = new Date(now);
        monday.setDate(now.getDate() - 5);
        const monStr = monday.toISOString().split("T")[0];

        const { data: weekBlocks } = await supabase
          .from("daily_plan")
          .select("status")
          .eq("student_id", studentId)
          .gte("plan_date", monStr)
          .lte("plan_date", today);

        const doneWeek = weekBlocks?.filter(b => b.status === "Done").length || 0;

        if (doneWeek >= 120) {
          const { data: existingWeekly } = await supabase
            .from("achievements")
            .select("id")
            .eq("student_id", studentId)
            .eq("name", "Weekly Warrior")
            .gte("criteria_met_at", monStr + "T00:00:00");

          if (!existingWeekly || existingWeekly.length === 0) {
            await supabase.from("achievements").insert({
              student_id: studentId,
              type: "badge",
              name: "Weekly Warrior",
              description: "Completed 120+ lessons in one week!",
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}
