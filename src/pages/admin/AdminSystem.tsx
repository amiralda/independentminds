import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/admin/StatCard";
import { Activity, Shield, AlertOctagon, Gauge } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const EDGE_FUNCTIONS = [
  "ai-tutor", "parent-alerts", "daily-report", "weekly-report",
  "morning-reminder", "checkin-reminder", "hourly-monitor",
  "weekly-badge", "account-merge", "auth-email-hook"
];

export default function AdminSystem() {
  const [flagged, setFlagged] = useState<any[]>([]);
  const [rateLimits, setRateLimits] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("flagged_inputs").select("*").order("flagged_at", { ascending: false }).limit(20),
      supabase.from("rate_limits").select("*").order("window_start", { ascending: false }).limit(20),
    ]).then(([flaggedRes, rlRes]) => {
      setFlagged(flaggedRes.data || []);
      setRateLimits(rlRes.data || []);
    });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">System Health</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Edge Functions" value={EDGE_FUNCTIONS.length} icon={Activity} color="text-emerald-400" />
        <StatCard label="Flagged Inputs" value={flagged.length} icon={AlertOctagon} color="text-red-400" />
        <StatCard label="Rate Limit Events" value={rateLimits.length} icon={Gauge} color="text-amber-400" />
        <StatCard label="Security Status" value="Active" icon={Shield} color="text-emerald-400" />
      </div>

      {/* Edge Functions Grid */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Edge Functions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {EDGE_FUNCTIONS.map((fn) => (
            <div key={fn} className="bg-white/5 rounded-lg p-3 text-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2" />
              <span className="text-white/70 text-xs font-mono">{fn}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flagged Inputs */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Flagged AI Inputs</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">Student</TableHead>
              <TableHead className="text-white/60">Reason</TableHead>
              <TableHead className="text-white/60">Length</TableHead>
              <TableHead className="text-white/60">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flagged.map((f) => (
              <TableRow key={f.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white/70 text-xs font-mono">{f.student_id?.slice(0, 8)}…</TableCell>
                <TableCell className="text-red-400 text-xs">{f.flag_reason}</TableCell>
                <TableCell className="text-white/50">{f.input_length}</TableCell>
                <TableCell className="text-white/50 text-xs">{f.flagged_at ? new Date(f.flagged_at).toLocaleDateString() : "—"}</TableCell>
              </TableRow>
            ))}
            {flagged.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={4} className="text-center text-white/40 py-8">No flagged inputs</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
