import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame, GraduationCap, TrendingUp, Zap } from "lucide-react";

const GRADUATION_DATE = new Date("2026-07-03T00:00:00");

interface Props {
  studentId: string;
  todayDone: number;
  todayTotal: number;
}

export function StudentStatsBar({ studentId, todayDone, todayTotal }: Props) {
  // 7-day velocity
  const { data: velocity = { avg: 0, streak: 0 } } = useQuery({
    queryKey: ["student_velocity", studentId],
    queryFn: async () => {
      const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_plan")
        .select("plan_date, status")
        .eq("student_id", studentId)
        .gte("plan_date", sevenAgo);

      const byDate: Record<string, number> = {};
      (data || []).forEach(b => {
        if (b.status === "Done") byDate[b.plan_date] = (byDate[b.plan_date] || 0) + 1;
      });

      const days = Object.keys(byDate).length;
      const totalDone = Object.values(byDate).reduce((a, b) => a + b, 0);
      const avg = days > 0 ? Math.round((totalDone / days) * 10) / 10 : 0;

      // Streak: consecutive days hitting 20+, working backward
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
        const count = byDate[d] || 0;
        // For today, also count live todayDone if greater
        if (i === 0) {
          if (Math.max(count, todayDone) >= 20) streak++;
          else break;
        } else {
          if (count >= 20) streak++;
          else break;
        }
      }

      return { avg, streak };
    },
    enabled: !!studentId,
    staleTime: 60000,
  });

  const daysLeft = Math.max(0, Math.ceil((GRADUATION_DATE.getTime() - Date.now()) / 86400000));
  const progress = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
  const isComplete = progress >= 100;

  const paceLabel = velocity.avg >= 20 ? "On Track" : velocity.avg >= 15 ? "Steady" : "Needs Boost";
  const paceColor = velocity.avg >= 20
    ? "bg-success text-success-foreground"
    : velocity.avg >= 15
      ? "bg-secondary text-secondary-foreground"
      : "bg-primary text-primary-foreground";

  return (
    <div className="space-y-3 mb-4" role="status" aria-live="polite" aria-label="Student statistics">
      {/* Progress bar with pace badge */}
      <div className="rounded-2xl bg-primary p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-secondary" />
            <span className="text-primary-foreground text-xs font-medium">
              Today: {todayDone}/{todayTotal}
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${paceColor}`}>
            {paceLabel}
          </span>
        </div>
        <div
          className="relative h-3 rounded-full bg-primary-foreground/20 overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Today's progress: ${progress}%`}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isComplete
                ? "bg-secondary shadow-[0_0_12px_hsl(43,89%,61%),0_0_24px_hsl(43,89%,61%,0.4)]"
                : "bg-gradient-to-r from-secondary to-secondary/80"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-primary-foreground/60 text-[10px] mt-1.5 text-right font-display">
          {progress}% complete
        </p>
      </div>

      {/* Stats cards row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card border p-3 text-center shadow-sm">
          <GraduationCap size={18} className="mx-auto text-primary mb-1" />
          <p className="font-display text-xl font-bold text-primary">{daysLeft}</p>
          <p className="text-[9px] text-muted-foreground leading-tight">Days Left</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center shadow-sm">
          <Flame size={18} className="mx-auto text-secondary mb-1" />
          <p className="font-display text-xl font-bold text-secondary">{velocity.streak}</p>
          <p className="text-[9px] text-muted-foreground leading-tight">Day Streak</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center shadow-sm">
          <Zap size={18} className="mx-auto text-accent mb-1" />
          <p className="font-display text-xl font-bold text-accent">{velocity.avg}</p>
          <p className="text-[9px] text-muted-foreground leading-tight">Avg/Day (7d)</p>
        </div>
      </div>
    </div>
  );
}
