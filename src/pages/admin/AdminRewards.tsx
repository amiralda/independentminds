import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import StatCard from "@/components/admin/StatCard";
import { Coins, Gift, Clock, Star } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminRewards() {
  const [stats, setStats] = useState({ issued: 0, redeemed: 0, pending: 0, catalogItems: 0 });
  const [pendingList, setPendingList] = useState<any[]>([]);
  const tick = useAutoRefresh();

  useEffect(() => {
    const load = async () => {
      const [issuedRes, redeemedRes, pendingRes, catalogRes, pendingListRes] = await Promise.all([
        supabase.from("reward_points").select("points").gt("points", 0),
        supabase.from("reward_points").select("points").lt("points", 0),
        supabase.from("reward_redemptions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("rewards_catalog").select("id", { count: "exact", head: true }),
        supabase.from("reward_redemptions").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(20),
      ]);

      setStats({
        issued: (issuedRes.data || []).reduce((s, r) => s + r.points, 0),
        redeemed: Math.abs((redeemedRes.data || []).reduce((s, r) => s + r.points, 0)),
        pending: pendingRes.count || 0,
        catalogItems: catalogRes.count || 0,
      });
      setPendingList(pendingListRes.data || []);
    };
    load();
  }, [tick]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Rewards Economy</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Points Issued" value={stats.issued} icon={Coins} color="text-amber-400" />
        <StatCard label="Points Redeemed" value={stats.redeemed} icon={Gift} color="text-purple-400" />
        <StatCard label="Pending Redemptions" value={stats.pending} icon={Clock} color="text-orange-400" />
        <StatCard label="Catalog Items" value={stats.catalogItems} icon={Star} color="text-blue-400" />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Pending Redemptions</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">Student</TableHead>
              <TableHead className="text-white/60">Points</TableHead>
              <TableHead className="text-white/60">Status</TableHead>
              <TableHead className="text-white/60">Requested</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingList.map((r) => (
              <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white/70 text-xs font-mono">{r.student_id?.slice(0, 8)}…</TableCell>
                <TableCell className="text-white">{r.points_spent}</TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">{r.status}</span>
                </TableCell>
                <TableCell className="text-white/50 text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {pendingList.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={4} className="text-center text-white/40 py-8">No pending redemptions</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
