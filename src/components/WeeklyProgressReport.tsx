import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Send, TrendingUp, Award, Coins, Smile, Target, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { useI18n } from "@/lib/i18n";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(210, 60%, 50%)",
  "hsl(280, 50%, 55%)",
  "hsl(30, 70%, 50%)",
  "hsl(160, 50%, 45%)",
];

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
    label: `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
  };
}

export function WeeklyProgressReport({ studentId }: { studentId: string }) {
  const { lang } = useI18n();
  const [weekOffset, setWeekOffset] = useState(0);
  const [sending, setSending] = useState(false);
  const week = getWeekRange(weekOffset);

  const { data: blocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["weekly_blocks", studentId, week.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_plan")
        .select("plan_date, status, subject, self_rating, time4learning_score")
        .eq("student_id", studentId)
        .gte("plan_date", week.start)
        .lte("plan_date", week.end)
        .order("plan_date");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: checkIns = [] } = useQuery({
    queryKey: ["weekly_checkins", studentId, week.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("timestamp, mood, focus")
        .eq("student_id", studentId)
        .gte("timestamp", week.start + "T00:00:00")
        .lte("timestamp", week.end + "T23:59:59")
        .order("timestamp");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: badges = [] } = useQuery({
    queryKey: ["weekly_badges", studentId, week.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("name, type, criteria_met_at")
        .eq("student_id", studentId)
        .gte("criteria_met_at", week.start + "T00:00:00")
        .lte("criteria_met_at", week.end + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pointsEarned = 0 } = useQuery({
    queryKey: ["weekly_points", studentId, week.start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_points")
        .select("points")
        .eq("student_id", studentId)
        .gte("created_at", week.start + "T00:00:00")
        .lte("created_at", week.end + "T23:59:59");
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + r.points, 0);
    },
  });

  // Derived data
  const stats = useMemo(() => {
    const done = blocks.filter(b => b.status === "Done");
    const total = blocks.length;
    const rate = total > 0 ? Math.round((done.length / total) * 100) : 0;

    // Daily completion
    const dayMap: Record<string, { done: number; total: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(week.start + "T00:00:00");
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      dayMap[ds] = { done: 0, total: 0 };
    }
    blocks.forEach(b => {
      if (dayMap[b.plan_date]) {
        dayMap[b.plan_date].total++;
        if (b.status === "Done") dayMap[b.plan_date].done++;
      }
    });
    const dailyData = Object.entries(dayMap).map(([date, v]) => ({
      day: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      done: v.done,
      missed: v.total - v.done,
    }));

    // Subject breakdown
    const subjectMap: Record<string, number> = {};
    done.forEach(b => { subjectMap[b.subject] = (subjectMap[b.subject] || 0) + 1; });
    const subjectData = Object.entries(subjectMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Streak (consecutive days with at least 1 done block)
    const daysWithDone = new Set(done.map(b => b.plan_date));
    let streak = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(week.start + "T00:00:00");
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      if (ds > new Date().toISOString().split("T")[0]) continue;
      if (daysWithDone.has(ds)) streak++;
      else if (streak > 0) break;
    }

    // Avg score
    const scores = done.filter(b => b.time4learning_score != null).map(b => b.time4learning_score!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    // Mood trend
    const moodValues: Record<string, number> = { "😊": 5, "😌": 4, "😐": 3, "😞": 2, "😤": 1 };
    const focusValues: Record<string, number> = { "🎯": 5, "👍": 4, "😐": 3, "😴": 2, "🤯": 1 };
    const moodTrend = checkIns.map(c => ({
      time: new Date(c.timestamp).toLocaleDateString("en-US", { weekday: "short" }),
      mood: moodValues[c.mood] || 3,
      focus: focusValues[c.focus] || 3,
    }));

    return { done: done.length, total, rate, dailyData, subjectData, streak, avgScore, moodTrend };
  }, [blocks, checkIns, week.start]);

  const handleSend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("parent-alerts", {
        body: { type: "weekly_summary", student_id: studentId },
      });
      if (error) throw error;
      toast.success(t("report.sent"));
    } catch {
      toast.error(t("report.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const navy = [26, 54, 93] as const;
    const gold = [212, 160, 23] as const;
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageW, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Independent Minds EDU", 14, 16);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(lang === "HT" ? "Rapò Semèn" : "Weekly Progress Report", 14, 24);

    // Gold accent line
    doc.setDrawColor(...gold);
    doc.setLineWidth(1.5);
    doc.line(0, 32, pageW, 32);

    let y = 44;
    doc.setTextColor(26, 54, 93);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${lang === "HT" ? "Semèn" : "Week"}: ${week.label}`, 14, y);
    y += 10;

    // Summary stats
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const summaryItems = [
      [`${lang === "HT" ? "Konplete" : "Completion Rate"}`, `${stats.rate}% (${stats.done}/${stats.total})`],
      [`${lang === "HT" ? "Konsekitif" : "Streak"}`, `${stats.streak} ${lang === "HT" ? "jou" : "days"}`],
      [`${lang === "HT" ? "Pwen" : "Points Earned"}`, `${pointsEarned}`],
      [`${lang === "HT" ? "Badj" : "Badges"}`, `${badges.length}`],
    ];
    if (stats.avgScore !== null) summaryItems.push([`${lang === "HT" ? "Mwayèn Nòt" : "Avg Score"}`, `${stats.avgScore}%`]);

    summaryItems.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label + ":", 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 70, y);
      y += 7;
    });
    y += 5;

    // Subject breakdown
    if (stats.subjectData.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(lang === "HT" ? "Pa Matyè" : "Subject Breakdown", 14, y);
      y += 7;
      doc.setFontSize(10);
      stats.subjectData.forEach(s => {
        doc.setFont("helvetica", "normal");
        doc.text(`${s.name}: ${s.value} ${lang === "HT" ? "blòk" : "blocks"}`, 20, y);
        y += 6;
      });
      y += 5;
    }

    // Daily breakdown
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(lang === "HT" ? "Chak Jou" : "Daily Breakdown", 14, y);
    y += 7;
    doc.setFontSize(10);
    stats.dailyData.forEach(d => {
      doc.setFont("helvetica", "normal");
      doc.text(`${d.day}: ${d.done} ${lang === "HT" ? "fini" : "done"}, ${d.missed} ${lang === "HT" ? "manke" : "remaining"}`, 20, y);
      y += 6;
    });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated ${new Date().toLocaleDateString()} — Independent Minds EDU`, 14, footerY);

    const studentName = studentId.replace(/[^a-zA-Z0-9]/g, "_");
    const weekLabel = week.label.replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`IME_Report_${studentName}_${weekLabel}.pdf`);
    toast.success(t("report.pdfDownloaded"));
  };

  if (blocksLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Week Selector */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft size={18} />
        </Button>
        <h3 className="font-display font-bold text-sm">{week.label}</h3>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={weekOffset >= 0}>
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard icon={TrendingUp} label={lang === "HT" ? "Konplete" : "Completion"} value={`${stats.rate}%`} sub={`${stats.done}/${stats.total}`} color="primary" />
        <SummaryCard icon={Target} label={lang === "HT" ? "Konsekitif" : "Streak"} value={`${stats.streak}d`} sub={lang === "HT" ? "jou konsekitif" : "day streak"} color="secondary" />
        <SummaryCard icon={Coins} label={lang === "HT" ? "Pwen" : "Points"} value={`${pointsEarned}`} sub={lang === "HT" ? "pwen genyen" : "earned this week"} color="accent" />
        <SummaryCard icon={Award} label={lang === "HT" ? "Badj" : "Badges"} value={`${badges.length}`} sub={badges.length > 0 ? badges.map(b => b.name).join(", ") : (lang === "HT" ? "pa gen nouvo" : "none this week")} color="primary" />
      </div>

      {/* Daily Completion Chart */}
      <div className="rounded-2xl bg-card border p-4 shadow-sm">
        <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          {lang === "HT" ? "Konplete Chak Jou" : "Daily Completion"}
        </h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.dailyData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
            <Bar dataKey="done" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} name={lang === "HT" ? "Fini" : "Done"} />
            <Bar dataKey="missed" stackId="a" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name={lang === "HT" ? "Manke" : "Remaining"} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Subject Breakdown Pie */}
      {stats.subjectData.length > 0 && (
        <div className="rounded-2xl bg-card border p-4 shadow-sm">
          <h4 className="font-display font-semibold text-sm mb-3">
            {lang === "HT" ? "Pa Matyè" : "By Subject"}
          </h4>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={stats.subjectData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                  {stats.subjectData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {stats.subjectData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto font-medium text-muted-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mood & Focus Trend */}
      {stats.moodTrend.length > 0 && (
        <div className="rounded-2xl bg-card border p-4 shadow-sm">
          <h4 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
            <Smile size={16} className="text-secondary" />
            {lang === "HT" ? "Imè & Konsantrasyon" : "Mood & Focus Trend"}
          </h4>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={stats.moodTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line type="monotone" dataKey="mood" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 3 }} name={lang === "HT" ? "Imè" : "Mood"} />
              <Line type="monotone" dataKey="focus" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name={lang === "HT" ? "Konsantrasyon" : "Focus"} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Avg Score */}
      {stats.avgScore !== null && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">{lang === "HT" ? "Mwayèn Nòt" : "Average Score"}</p>
          <p className="font-display text-3xl font-bold text-primary">{stats.avgScore}%</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSend} disabled={sending} className="flex-1 font-display">
          <Send size={16} className="mr-2" />
          {sending
            ? (lang === "HT" ? "Ap voye..." : "Sending...")
            : (lang === "HT" ? "Voye Rapò" : "Send Report")}
        </Button>
        <Button
          variant="outline"
          className="font-display"
          onClick={() => handleDownloadPdf()}
          aria-label={lang === "HT" ? "Telechaje Rapò PDF" : "Download Report PDF"}
        >
          <Download size={16} className="mr-2" />
          PDF
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className={`rounded-xl bg-${color}/5 border border-${color}/20 p-3 text-center`}>
      <Icon size={16} className={`mx-auto mb-1 text-${color}`} />
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl font-bold text-${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}
