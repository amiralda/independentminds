import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import StatCard from "@/components/admin/StatCard";
import { Eye, EyeOff, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  parent_id: string;
  student_id: string;
  action: string;
  created_at: string;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [parentFilter, setParentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const tick = useAutoRefresh();

  useEffect(() => {
    fetchLogs();
  }, [tick]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("impersonation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (dateFrom) {
      query = query.gte("created_at", new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      query = query.lt("created_at", end.toISOString());
    }

    const { data } = await query;
    const entries = (data || []) as LogEntry[];
    setLogs(entries);

    // Fetch parent display names
    const parentIds = [...new Set(entries.map(l => l.parent_id))];
    if (parentIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", parentIds);
      const map: Record<string, string> = {};
      (profileData || []).forEach((p: any) => { map[p.id] = p.display_name; });
      setProfiles(map);
    }
    setLoading(false);
  };

  const filteredLogs = parentFilter
    ? logs.filter(l => {
        const name = profiles[l.parent_id] || l.parent_id;
        return name.toLowerCase().includes(parentFilter.toLowerCase());
      })
    : logs;

  const startCount = filteredLogs.filter(l => l.action === "start").length;
  const endCount = filteredLogs.filter(l => l.action === "end").length;
  const uniqueParents = new Set(filteredLogs.map(l => l.parent_id)).size;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">Impersonation Audit Logs</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Events" value={filteredLogs.length} icon={Eye} color="text-blue-400" />
        <StatCard label="Sessions Started" value={startCount} icon={Eye} color="text-emerald-400" />
        <StatCard label="Sessions Ended" value={endCount} icon={EyeOff} color="text-amber-400" />
        <StatCard label="Unique Parents" value={uniqueParents} icon={Filter} color="text-purple-400" />
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-white/50 text-xs mb-1 block">Parent Name</label>
            <Input
              placeholder="Filter by parent name..."
              value={parentFilter}
              onChange={e => setParentFilter(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="flex-1">
            <label className="text-white/50 text-xs mb-1 block">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="flex-1">
            <label className="text-white/50 text-xs mb-1 block">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={fetchLogs}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Calendar size={16} className="mr-2" />
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Activity Log</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="text-white/60">Parent</TableHead>
                <TableHead className="text-white/60">Student</TableHead>
                <TableHead className="text-white/60">Action</TableHead>
                <TableHead className="text-white/60">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={4} className="text-center text-white/40 py-8">Loading…</TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={4} className="text-center text-white/40 py-8">No impersonation logs found</TableCell>
                </TableRow>
              ) : (
                filteredLogs.map(log => (
                  <TableRow key={log.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/80 text-sm">
                      {profiles[log.parent_id] || log.parent_id.slice(0, 8) + "…"}
                    </TableCell>
                    <TableCell className="text-white/70 text-sm font-mono">{log.student_id}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.action === "start"
                          ? "bg-emerald-400/15 text-emerald-400"
                          : "bg-amber-400/15 text-amber-400"
                      }`}>
                        {log.action === "start" ? <Eye size={12} /> : <EyeOff size={12} />}
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-white/50 text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
