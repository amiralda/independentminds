import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import StatCard from "@/components/admin/StatCard";
import { MessageSquare, Check, X, AlertTriangle } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function AdminMessages() {
  const [stats, setStats] = useState({ total: 0, delivered: 0, failed: 0, sos: 0 });
  const [messages, setMessages] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const tick = useAutoRefresh();

  useEffect(() => {
    const load = async () => {
      const [totalRes, deliveredRes, failedRes, sosRes] = await Promise.all([
        supabase.from("messages_log").select("id", { count: "exact", head: true }),
        supabase.from("messages_log").select("id", { count: "exact", head: true }).eq("status", "Sent"),
        supabase.from("messages_log").select("id", { count: "exact", head: true }).eq("status", "Failed"),
        supabase.from("messages_log").select("id", { count: "exact", head: true }).eq("type", "sos"),
      ]);
      setStats({
        total: totalRes.count || 0,
        delivered: deliveredRes.count || 0,
        failed: failedRes.count || 0,
        sos: sosRes.count || 0,
      });
    };
    load();
  }, [tick]);

  useEffect(() => {
    let query = supabase.from("messages_log").select("*").order("timestamp", { ascending: false }).limit(50);
    if (filter === "delivered") query = query.eq("status", "Sent");
    if (filter === "failed") query = query.eq("status", "Failed");
    if (filter === "sos") query = query.eq("type", "sos");
    query.then(({ data }) => setMessages(data || []));
  }, [filter, tick]);

  const filters = ["all", "delivered", "failed", "sos"];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Messages Log</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Total Sent" value={stats.total} icon={MessageSquare} color="text-blue-400" />
        <StatCard label="Delivered" value={stats.delivered} icon={Check} color="text-emerald-400" />
        <StatCard label="Failed" value={stats.failed} icon={X} color="text-red-400" />
        <StatCard label="SOS Alerts" value={stats.sos} icon={AlertTriangle} color="text-amber-400" />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/8"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">Type</TableHead>
              <TableHead className="text-white/60">Channel</TableHead>
              <TableHead className="text-white/60">Recipient</TableHead>
              <TableHead className="text-white/60">Status</TableHead>
              <TableHead className="text-white/60">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((m) => (
              <TableRow key={m.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white/70 text-xs">{m.type}</TableCell>
                <TableCell className="text-white/70 text-xs">{m.channel}</TableCell>
                <TableCell className="text-white/50 text-xs font-mono">{m.recipient?.slice(0, 15)}…</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    m.status === "Sent" ? "bg-emerald-500/20 text-emerald-400" :
                    m.status === "Failed" ? "bg-red-500/20 text-red-400" :
                    "bg-amber-500/20 text-amber-400"
                  }`}>{m.status}</span>
                </TableCell>
                <TableCell className="text-white/50 text-xs">{new Date(m.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {messages.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={5} className="text-center text-white/40 py-8">No messages</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
