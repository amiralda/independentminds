import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Star, Flame, Target } from "lucide-react";

interface WeekStats {
  total: number;
  done: number;
  rate: number;
  streak: number;
}

export function BadgesPanel() {
  const { t } = useI18n();
  const [stats, setStats] = useState<WeekStats>({ total: 0, done: 0, rate: 0, streak: 0 });

  useEffect(() => {
    fetchWeekStats();
  }, []);

  const fetchWeekStats = async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("daily_plan")
      .select("status")
      .eq("student_id", "CHRIS")
      .gte("plan_date", monday.toISOString().split("T")[0]);

    if (data) {
      const total = data.length;
      const done = data.filter(d => d.status === "Done").length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;
      
      // Simple streak: count consecutive days with all blocks done
      setStats({ total, done, rate, streak: done > 0 ? Math.min(done, 5) : 0 });
    }
  };

  const getBadge = (rate: number) => {
    if (rate >= 90) return { key: "badge.champion", icon: Trophy, color: "from-warning to-accent" };
    if (rate >= 75) return { key: "badge.goldStar", icon: Star, color: "from-warning to-primary" };
    if (rate >= 50) return { key: "badge.keepGoing", icon: Flame, color: "from-primary to-secondary" };
    return { key: "badge.newWeek", icon: Target, color: "from-muted to-primary" };
  };

  const badge = getBadge(stats.rate);
  const BadgeIcon = badge.icon;

  return (
    <div className="space-y-6">
      {/* Main badge */}
      <div className={`rounded-2xl bg-gradient-to-br ${badge.color} p-8 text-center shadow-lg`}>
        <BadgeIcon size={64} className="mx-auto mb-4 text-primary-foreground drop-shadow-md" />
        <h2 className="font-display text-2xl font-bold text-primary-foreground">{t(badge.key)}</h2>
        <p className="text-primary-foreground/80 mt-2 text-lg">{stats.rate}% {t("nav.today")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card p-4 text-center shadow-sm border">
          <p className="font-display text-3xl font-bold text-primary">{stats.done}</p>
          <p className="text-xs text-muted-foreground mt-1">Blocks Done</p>
        </div>
        <div className="rounded-xl bg-card p-4 text-center shadow-sm border">
          <p className="font-display text-3xl font-bold text-secondary">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Blocks</p>
        </div>
        <div className="rounded-xl bg-card p-4 text-center shadow-sm border">
          <p className="font-display text-3xl font-bold text-warning">{stats.streak}</p>
          <p className="text-xs text-muted-foreground mt-1">🔥 Streak</p>
        </div>
      </div>

      {/* Streak visual */}
      <div className="rounded-xl bg-card p-4 shadow-sm border">
        <h3 className="font-display font-semibold mb-3">This Week / Semèn sa a</h3>
        <div className="flex gap-2 justify-center">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
            <div
              key={day}
              className={`w-12 h-12 rounded-lg flex items-center justify-center font-display text-xs font-medium ${
                i < stats.streak
                  ? "bg-success text-success-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < stats.streak ? "✅" : day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
