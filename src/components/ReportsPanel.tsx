import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Clock, Target, Zap, Calendar, Send } from "lucide-react";
import { toast } from "sonner";

const TOTAL_ACTIVITIES = 2039;
const GRADUATION_DATE = new Date("2026-07-03T00:00:00");
const START_DATE = new Date("2026-03-08T00:00:00");

function useCountdown() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);
  const diff = GRADUATION_DATE.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes };
}

export function ReportsPanel({ studentId }: { studentId: string }) {
  const countdown = useCountdown();
  const [sendingReport, setSendingReport] = useState(false);

  const handleSendWeeklySummary = async () => {
    setSendingReport(true);
    try {
      const { error } = await supabase.functions.invoke("parent-alerts", {
        body: { type: "weekly_summary", student_id: studentId },
      });
      if (error) throw error;
      toast.success("Weekly summary sent to parent! 📧");
    } catch (e) {
      toast.error("Failed to send weekly summary");
    } finally {
      setSendingReport(false);
    }
  };

  // Fetch all done blocks grouped by date
  const { data: allDone = [], isLoading } = useQuery({
    queryKey: ["reports_all_done", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_plan")
        .select("plan_date, status, subject, time4learning_score")
        .eq("student_id", studentId)
        .eq("status", "Done")
        .order("plan_date");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch last 7 days blocks for velocity
  const { data: recentBlocks = [] } = useQuery({
    queryKey: ["reports_recent", studentId],
    queryFn: async () => {
      const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_plan")
        .select("plan_date, status, subject, time4learning_score")
        .eq("student_id", studentId)
        .gte("plan_date", sevenAgo)
        .order("plan_date");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch current week blocks for weekly sprint
  const { data: weekBlocks = [] } = useQuery({
    queryKey: ["reports_week", studentId],
    queryFn: async () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      const monStr = monday.toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_plan")
        .select("plan_date, status, subject, time4learning_score, self_rating")
        .eq("student_id", studentId)
        .gte("plan_date", monStr)
        .order("plan_date");
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  // === Burndown chart data ===
  const totalDays = Math.ceil((GRADUATION_DATE.getTime() - START_DATE.getTime()) / 86400000);
  const dailyTarget = TOTAL_ACTIVITIES / totalDays;

  // Group done by date
  const doneByDate: Record<string, number> = {};
  allDone.forEach(b => {
    doneByDate[b.plan_date] = (doneByDate[b.plan_date] || 0) + 1;
  });

  // Build burndown points (weekly intervals for readability)
  const burndownData: { date: string; target: number; actual: number }[] = [];
  let cumulativeDone = 0;
  const sortedDates = Object.keys(doneByDate).sort();

  for (let d = new Date(START_DATE); d <= GRADUATION_DATE && d <= new Date(); d.setDate(d.getDate() + 7)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayIndex = Math.ceil((d.getTime() - START_DATE.getTime()) / 86400000);
    const targetRemaining = Math.max(0, Math.round(TOTAL_ACTIVITIES - dailyTarget * dayIndex));

    // Count done up to this date
    for (const sd of sortedDates) {
      if (sd <= dateStr && doneByDate[sd]) {
        cumulativeDone += doneByDate[sd];
        delete doneByDate[sd]; // don't double count
      }
    }
    const actualRemaining = TOTAL_ACTIVITIES - cumulativeDone;

    burndownData.push({
      date: new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      target: targetRemaining,
      actual: actualRemaining,
    });
  }

  // === Velocity ===
  const last7Done = recentBlocks.filter(b => b.status === "Done");
  const uniqueDays = new Set(recentBlocks.map(b => b.plan_date)).size;
  const avgVelocity = uniqueDays > 0 ? Math.round((last7Done.length / uniqueDays) * 10) / 10 : 0;
  const onTrack = avgVelocity >= 20;

  // === Weekly sprint ===
  const weekDone = weekBlocks.filter(b => b.status === "Done");
  const weekScores = weekDone.filter(b => b.time4learning_score != null).map(b => b.time4learning_score!);
  const weekRatings = weekDone.filter(b => b.self_rating != null).map(b => b.self_rating!);
  const avgScore = weekScores.length > 0 ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length) : 0;
  const avgFocus = weekRatings.length > 0 ? (weekRatings.reduce((a, b) => a + b, 0) / weekRatings.length).toFixed(1) : "—";

  // === Daily velocity bar chart (last 7 days) ===
  const velocityByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    velocityByDay[d] = 0;
  }
  recentBlocks.filter(b => b.status === "Done").forEach(b => {
    if (velocityByDay[b.plan_date] !== undefined) velocityByDay[b.plan_date]++;
  });
  const velocityData = Object.entries(velocityByDay).map(([date, count]) => ({
    day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    done: count,
    target: 20,
  }));

  // === Monthly mastery ===
  const CORE_SUBJECTS = ["Math", "English", "Science", "Social Studies"];
  const monthlyData: Record<string, Record<string, { done: number; total: number }>> = {};
  allDone.forEach(b => {
    if (!CORE_SUBJECTS.includes(b.subject)) return;
    const month = b.plan_date.slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = {};
    if (!monthlyData[month][b.subject]) monthlyData[month][b.subject] = { done: 0, total: 0 };
    monthlyData[month][b.subject].done++;
    monthlyData[month][b.subject].total++;
  });

  return (
    <div className="space-y-6">
      {/* Graduation Countdown */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-center shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock size={20} className="text-secondary" />
          <h3 className="font-display text-lg font-bold text-primary-foreground">Graduation Countdown</h3>
        </div>
        <div className="flex justify-center gap-6">
          {[
            { value: countdown.days, label: "Days" },
            { value: countdown.hours, label: "Hours" },
            { value: countdown.minutes, label: "Minutes" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-4xl font-bold text-secondary">{value}</p>
              <p className="text-primary-foreground/70 text-xs font-medium">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-primary-foreground/60 text-xs mt-3">July 3, 2026 · {TOTAL_ACTIVITIES - allDone.length} activities remaining</p>
      </div>

      {/* Velocity Metric */}
      <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 ${
        onTrack ? "border-success bg-success/5" : "border-destructive bg-destructive/5"
      }`}>
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
          onTrack ? "bg-success/20" : "bg-destructive/20"
        }`}>
          {onTrack ? <TrendingUp size={28} className="text-success" /> : <TrendingDown size={28} className="text-destructive" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-lg">{avgVelocity}</h3>
            <span className="text-muted-foreground text-sm">lessons/day avg (7d)</span>
          </div>
          <p className={`text-sm font-medium ${onTrack ? "text-success" : "text-destructive"}`}>
            {onTrack ? "✅ On Track" : "⚠️ Behind Schedule"} — Target: 20/day
          </p>
        </div>
        <Zap size={20} className={onTrack ? "text-secondary" : "text-destructive/40"} />
      </div>

      {/* Daily Velocity Bar Chart */}
      <div className="rounded-2xl bg-card border p-5 shadow-sm">
        <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
          <Target size={18} className="text-primary" /> Daily Velocity (Last 7 Days)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={velocityData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="done" radius={[4, 4, 0, 0]}>
              {velocityData.map((entry, i) => (
                <Cell key={i} fill={entry.done >= 20 ? "hsl(var(--success))" : "hsl(var(--primary))"} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="target" stroke="hsl(var(--destructive))" strokeDasharray="5 5" dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Burndown Chart */}
      <div className="rounded-2xl bg-card border p-5 shadow-sm">
        <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-primary" /> Graduation Burndown
        </h3>
        {burndownData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="target" stroke="hsl(var(--secondary))" strokeWidth={2} name="Target Pace" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} name="Actual Remaining" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-muted-foreground py-8">No data yet — start marking blocks as Done!</p>
        )}
      </div>

      {/* Weekly Sprint Summary */}
      <div className="rounded-2xl bg-card border p-5 shadow-sm">
        <h3 className="font-display font-semibold mb-4">📊 Weekly Sprint</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
            <p className="font-display text-3xl font-bold text-primary">{weekDone.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Done</p>
          </div>
          <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4 text-center">
            <p className="font-display text-3xl font-bold text-secondary">{avgScore}%</p>
            <p className="text-xs text-muted-foreground mt-1">Avg Score</p>
          </div>
          <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 text-center">
            <p className="font-display text-3xl font-bold text-accent">{avgFocus}</p>
            <p className="text-xs text-muted-foreground mt-1">Focus Level</p>
          </div>
        </div>
      </div>

      {/* Monthly Mastery Table */}
      <div className="rounded-2xl bg-card border p-5 shadow-sm overflow-x-auto">
        <h3 className="font-display font-semibold mb-4">📅 Monthly Mastery</h3>
        {Object.keys(monthlyData).length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">No monthly data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-display font-semibold text-muted-foreground">Month</th>
                {CORE_SUBJECTS.map(s => (
                  <th key={s} className="text-center py-2 px-2 font-display font-semibold text-muted-foreground">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthlyData).sort().map(([month, subjects]) => (
                <tr key={month} className="border-b border-border/50">
                  <td className="py-2 px-2 font-medium">
                    {new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </td>
                  {CORE_SUBJECTS.map(s => {
                    const d = subjects[s];
                    return (
                      <td key={s} className="text-center py-2 px-2">
                        {d ? (
                          <span className="inline-block bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium text-xs">
                            {d.done}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Send Weekly Summary Button */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-dashed border-primary/30 p-5 text-center">
        <h3 className="font-display font-semibold mb-2">📬 Send Weekly Report</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Send the full weekly progress report to the parent via WhatsApp.
        </p>
        <Button
          onClick={handleSendWeeklySummary}
          disabled={sendingReport}
          className="font-display"
        >
          <Send size={16} className="mr-2" />
          {sendingReport ? "Sending..." : "Send Weekly Summary"}
        </Button>
      </div>
    </div>
  );
}
