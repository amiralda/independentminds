import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import StatCard from "@/components/admin/StatCard";
import { TrendingUp, AlertTriangle, SmilePlus, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminEngagement() {
  const [stats, setStats] = useState({ checkInsToday: 0, sosThisWeek: 0, totalCheckIns: 0 });
  const [dailyData, setDailyData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [checkInsTodayRes, sosRes, totalCIRes] = await Promise.all([
        supabase.from("check_ins").select("id", { count: "exact", head: true }).gte("timestamp", today),
        supabase.from("check_ins").select("id", { count: "exact", head: true }).eq("need_help", true).gte("timestamp", weekAgo),
        supabase.from("check_ins").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        checkInsToday: checkInsTodayRes.count || 0,
        sosThisWeek: sosRes.count || 0,
        totalCheckIns: totalCIRes.count || 0,
      });

      // Daily completions last 14 days
      const days: any[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const { count } = await supabase
          .from("activity_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "Done")
          .eq("log_date", dateStr);
        days.push({ day: d.toLocaleDateString("en", { month: "short", day: "numeric" }), count: count || 0 });
      }
      setDailyData(days);
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Engagement & Streaks</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Check-ins Today" value={stats.checkInsToday} icon={SmilePlus} color="text-emerald-400" />
        <StatCard label="SOS This Week" value={stats.sosThisWeek} icon={AlertTriangle} color="text-red-400" />
        <StatCard label="Total Check-ins" value={stats.totalCheckIns} icon={Zap} color="text-purple-400" />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Daily Completions (14 days)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={11} />
            <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
            <Tooltip contentStyle={{ background: "hsl(220,20%,18%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
            <Line type="monotone" dataKey="count" stroke="hsl(145,45%,45%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
