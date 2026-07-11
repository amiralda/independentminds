import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import StatCard from "@/components/admin/StatCard";
import { Activity, Shield, AlertOctagon, Gauge, Bug, Download, Check } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const EDGE_FUNCTIONS = [
  "ai-tutor", "parent-alerts", "daily-report", "weekly-report",
  "morning-reminder", "checkin-reminder", "hourly-monitor",
  "weekly-badge", "account-merge", "auth-email-hook", "track-error"
];

export default function AdminSystem() {
  const [flagged, setFlagged] = useState<unknown[]>([]);
  const [rateLimits, setRateLimits] = useState<unknown[]>([]);
  const [errors, setErrors] = useState<unknown[]>([]);
  const [errorFilter, setErrorFilter] = useState({ resolved: 'open' as string, role: 'all' as string });
  const tick = useAutoRefresh();

  useEffect(() => {
    Promise.all([
      supabase.from("flagged_inputs").select("*").order("flagged_at", { ascending: false }).limit(20),
      supabase.from("rate_limits").select("*").order("window_start", { ascending: false }).limit(20),
      fetchErrors(),
    ]).then(([flaggedRes, rlRes]) => {
      setFlagged(flaggedRes.data || []);
      setRateLimits(rlRes.data || []);
    });
    // `fetchErrors` is intentionally excluded to avoid dependency churn from function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const fetchErrors = async () => {
    let query = supabase
      .from("platform_errors" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) as any;

    if (errorFilter.resolved === 'open') {
      query = query.eq('resolved', false);
    } else if (errorFilter.resolved === 'resolved') {
      query = query.eq('resolved', true);
    }

    if (errorFilter.role !== 'all') {
      query = query.eq('user_role', errorFilter.role);
    }

    const { data } = await query;
    setErrors(data || []);
  };

  useEffect(() => {
    fetchErrors();
    // `fetchErrors` is intentionally excluded to avoid dependency churn from function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorFilter]);

  const markResolved = async (id: string) => {
    await supabase
      .from("platform_errors" as any)
      .update({ resolved: true } as any)
      .eq("id", id);
    setErrors((prev) => prev.map((e) => e.id === id ? { ...e, resolved: true } : e));
  };

  const markAllResolved = async () => {
    const openIds = errors.filter((e) => !e.resolved).map((e) => e.id);
    if (openIds.length === 0) return;
    await supabase
      .from("platform_errors" as any)
      .update({ resolved: true } as any)
      .in("id", openIds);
    setErrors((prev) => prev.map((e) => ({ ...e, resolved: true })));
    toast.success(`Marked ${openIds.length} errors resolved`);
  };

  const exportCsv = () => {
    const headers = ['Time', 'Role', 'Page', 'Error', 'Browser', 'Device', 'Resolved'];
    const rows = errors.map((e) => [
      new Date(e.created_at).toLocaleString(),
      e.user_role,
      e.page_path,
      `"${(e.error_message || '').replace(/"/g, '""')}"`,
      e.browser,
      e.device_type,
      e.resolved ? 'Yes' : 'No',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openErrorCount = errors.filter((e) => !e.resolved).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">System Health</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Edge Functions" value={EDGE_FUNCTIONS.length} icon={Activity} color="text-emerald-400" />
        <StatCard label="Flagged Inputs" value={flagged.length} icon={AlertOctagon} color="text-red-400" />
        <StatCard label="Rate Limit Events" value={rateLimits.length} icon={Gauge} color="text-amber-400" />
        <StatCard label="Open Errors" value={openErrorCount} icon={Bug} color="text-red-400" />
      </div>

      <Tabs defaultValue="functions">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="functions" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Functions
          </TabsTrigger>
          <TabsTrigger value="flagged" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Flagged
          </TabsTrigger>
          <TabsTrigger value="errors" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white relative">
            Errors
            {openErrorCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {openErrorCount > 9 ? '9+' : openErrorCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Functions tab */}
        <TabsContent value="functions">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mt-4">
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
        </TabsContent>

        {/* Flagged tab */}
        <TabsContent value="flagged">
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mt-4">
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
        </TabsContent>

        {/* Errors tab */}
        <TabsContent value="errors">
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mt-4">
            <div className="p-4 border-b border-white/10 flex flex-wrap items-center gap-3">
              <h2 className="text-white font-semibold">Platform Errors</h2>
              <div className="flex-1" />
              <select
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/70 text-xs [&>option]:text-slate-900 [&>option]:bg-white"
                value={errorFilter.resolved}
                onChange={(e) => setErrorFilter((f) => ({ ...f, resolved: e.target.value }))}
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="all">All</option>
              </select>
              <select
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/70 text-xs [&>option]:text-slate-900 [&>option]:bg-white"
                value={errorFilter.role}
                onChange={(e) => setErrorFilter((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="all">All roles</option>
                <option value="parent">Parent</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={markAllResolved}
                className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg"
              >
                <Check size={12} /> Mark all resolved
              </button>
              <button
                onClick={exportCsv}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg"
              >
                <Download size={12} /> CSV
              </button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-white/60">Time</TableHead>
                  <TableHead className="text-white/60">Role</TableHead>
                  <TableHead className="text-white/60">Page</TableHead>
                  <TableHead className="text-white/60">Error</TableHead>
                  <TableHead className="text-white/60">Status</TableHead>
                  <TableHead className="text-white/60"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((e) => (
                  <TableRow key={e.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/50 text-xs whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-white/70 text-xs">{e.user_role}</TableCell>
                    <TableCell className="text-white/70 text-xs font-mono">{e.page_path}</TableCell>
                    <TableCell className="text-red-400 text-xs max-w-[200px] truncate" title={e.error_message}>
                      {e.error_message}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        e.resolved
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {e.resolved ? 'Resolved' : 'Open'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {!e.resolved && (
                        <button
                          onClick={() => markResolved(e.id)}
                          className="text-xs text-teal-400 hover:text-teal-300"
                        >
                          Resolve
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {errors.length === 0 && (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={6} className="text-center text-white/40 py-8">
                      No errors found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
