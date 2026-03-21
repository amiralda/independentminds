import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import StatCard from "@/components/admin/StatCard";
import { Users, CheckCircle, Flame, Coins } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminOverview() {
  const [stats, setStats] = useState({ students: 0, activeLogs: 0, avgStreak: 0, pointsIssued: 0, pointsRedeemed: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const tick = useAutoRefresh();

  useEffect(() => {
    const load = async () => {
      const [studentsRes, logsRes, pointsRes, redeemedRes] = await Promise.all([
        supabase.from("students").select("student_id", { count: "exact", head: true }),
        supabase.from("activity_logs").select("id", { count: "exact", head: true }).eq("status", "Done"),
        supabase.from("reward_points").select("points").gt("points", 0),
        supabase.from("reward_points").select("points").lt("points", 0),
      ]);

      const totalIssued = (pointsRes.data || []).reduce((s, r) => s + r.points, 0);
      const totalRedeemed = Math.abs((redeemedRes.data || []).reduce((s, r) => s + r.points, 0));

      setStats({
        students: studentsRes.count || 0,
        activeLogs: logsRes.count || 0,
        avgStreak: 0,
        pointsIssued: totalIssued,
        pointsRedeemed: totalRedeemed,
      });

      // Weekly completions (last 7 days)
      const days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const { count } = await supabase
          .from("activity_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "Done")
          .eq("log_date", dateStr);
        days.push({ day: d.toLocaleDateString("en", { weekday: "short" }), completions: count || 0 });
      }
      setWeeklyData(days);
    };
    load();
  }, [tick]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Admin Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.students} icon={Users} color="text-emerald-400" />
        <StatCard label="Completed Lessons" value={stats.activeLogs} icon={CheckCircle} color="text-blue-400" />
        <StatCard label="Points Issued" value={stats.pointsIssued} icon={Coins} color="text-amber-400" />
        <StatCard label="Points Redeemed" value={stats.pointsRedeemed} icon={Flame} color="text-purple-400" />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Weekly Completions</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} />
            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: "hsl(220,20%,18%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
            />
            <Bar dataKey="completions" fill="hsl(145,45%,45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
