import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { SubjectIcon } from "@/components/SubjectIcon";
import { CalendarIcon, Printer, Download, FileText } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  studentId: string;
}

type QuickRange = "7d" | "14d" | "30d" | "custom";

export function StudentRecords({ studentId }: Props) {
  const { students } = useAuth();
  const student = students.find(s => s.student_id === studentId);
  const [quickRange, setQuickRange] = useState<QuickRange>("7d");
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 7));
  const [toDate, setToDate] = useState<Date>(new Date());
  const printRef = useRef<HTMLDivElement>(null);

  const handleQuickRange = (range: QuickRange) => {
    setQuickRange(range);
    const now = new Date();
    if (range === "7d") { setFromDate(subDays(now, 7)); setToDate(now); }
    else if (range === "14d") { setFromDate(subDays(now, 14)); setToDate(now); }
    else if (range === "30d") { setFromDate(subDays(now, 30)); setToDate(now); }
  };

  const fromStr = format(fromDate, "yyyy-MM-dd");
  const toStr = format(toDate, "yyyy-MM-dd");

  const { data: blocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["records_blocks", studentId, fromStr, toStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_plan")
        .select("*")
        .eq("student_id", studentId)
        .gte("plan_date", fromStr)
        .lte("plan_date", toStr)
        .order("plan_date")
        .order("block_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: checkIns = [], isLoading: checkInsLoading } = useQuery({
    queryKey: ["records_checkins", studentId, fromStr, toStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("student_id", studentId)
        .gte("timestamp", fromStr + "T00:00:00")
        .lte("timestamp", toStr + "T23:59:59")
        .order("timestamp", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = blocksLoading || checkInsLoading;

  // Stats
  const totalBlocks = blocks.length;
  const doneBlocks = blocks.filter(b => b.status === "Done").length;
  const missedBlocks = blocks.filter(b => b.status === "Missed").length;
  const completionRate = totalBlocks > 0 ? Math.round((doneBlocks / totalBlocks) * 100) : 0;

  // Group blocks by date
  const byDate = blocks.reduce<Record<string, typeof blocks>>((acc, b) => {
    (acc[b.plan_date] ||= []).push(b);
    return acc;
  }, {});

  // Subject breakdown
  const subjectStats: Record<string, { done: number; total: number }> = {};
  blocks.forEach(b => {
    if (!subjectStats[b.subject]) subjectStats[b.subject] = { done: 0, total: 0 };
    subjectStats[b.subject].total++;
    if (b.status === "Done") subjectStats[b.subject].done++;
  });

  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const safeName = escapeHtml(student?.display_name || studentId);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Student Records - ${safeName}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 16px; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        h3 { font-size: 14px; margin-top: 16px; color: #555; }
        .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
        .stats { display: flex; gap: 24px; margin: 12px 0; }
        .stat { text-align: center; }
        .stat-val { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 11px; color: #888; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .done { color: #16a34a; } .missed { color: #dc2626; } .planned { color: #888; }
        .checkin { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; margin: 6px 0; font-size: 12px; }
        @media print { body { padding: 12px; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["7d", "14d", "30d"] as QuickRange[]).map(r => (
            <Button
              key={r}
              size="sm"
              variant={quickRange === r ? "default" : "outline"}
              className="font-display text-xs"
              onClick={() => handleQuickRange(r)}
            >
              {r === "7d" ? "Last 7 Days" : r === "14d" ? "Last 14 Days" : "Last 30 Days"}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs justify-start", !fromDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {format(fromDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(d) => { if (d) { setFromDate(d); setQuickRange("custom"); } }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs justify-start", !toDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3 w-3" />
                {format(toDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(d) => { if (d) { setToDate(d); setQuickRange("custom"); } }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="font-display text-xs" onClick={handlePrint}>
            <Printer size={14} className="mr-1" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: totalBlocks, label: "Total", cls: "text-foreground" },
              { val: doneBlocks, label: "Done", cls: "text-success" },
              { val: missedBlocks, label: "Missed", cls: "text-destructive" },
              { val: `${completionRate}%`, label: "Rate", cls: "text-primary" },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-card border p-3 text-center">
                <p className={`font-display text-xl font-bold ${s.cls}`}>{s.val}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Subject Breakdown */}
          {Object.keys(subjectStats).length > 0 && (
            <div className="rounded-xl bg-card border p-4 shadow-sm">
              <h3 className="font-display font-semibold text-sm mb-3">📚 Subject Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(subjectStats).map(([subject, s]) => (
                  <div key={subject} className="flex items-center gap-2">
                    <SubjectIcon subject={subject} size={16} />
                    <span className="text-sm font-medium flex-1">{subject}</span>
                    <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${s.total > 0 ? (s.done / s.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{s.done}/{s.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Detail */}
          <div className="space-y-3">
            {Object.entries(byDate).map(([date, dayBlocks]) => (
              <div key={date} className="rounded-xl bg-card border p-4 shadow-sm">
                <h3 className="font-display font-semibold text-sm mb-2">
                  {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </h3>
                <div className="space-y-1.5">
                  {dayBlocks.map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                      <SubjectIcon subject={b.subject} size={14} />
                      <span className="font-medium flex-1">{b.subject}</span>
                      <span className="text-xs text-muted-foreground">{b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.status === "Done" ? "bg-success/20 text-success" :
                        b.status === "Missed" ? "bg-destructive/20 text-destructive" :
                        b.status === "In Progress" ? "bg-warning/20 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>{b.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Check-ins */}
          {checkIns.length > 0 && (
            <div className="rounded-xl bg-card border p-4 shadow-sm">
              <h3 className="font-display font-semibold text-sm mb-3">📝 Check-ins ({checkIns.length})</h3>
              <div className="space-y-2">
                {checkIns.map(c => (
                  <div key={c.id} className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span>Mood: <strong>{c.mood}</strong> · Focus: <strong>{c.focus}</strong> · Blocks: <strong>{c.blocks_done}</strong></span>
                      <span className="text-xs text-muted-foreground">{new Date(c.timestamp).toLocaleDateString()}</span>
                    </div>
                    {c.comment && <p className="text-xs text-muted-foreground mt-1 italic">"{c.comment}"</p>}
                    {c.need_help && <span className="text-xs text-destructive font-medium">⚠️ Help needed</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalBlocks === 0 && checkIns.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText size={36} className="mx-auto mb-3" />
              <p className="font-display text-lg">No records for this period</p>
            </div>
          )}
        </>
      )}

      {/* Hidden printable content */}
      <div ref={printRef} className="hidden">
        <h1>📄 Student Records — {student?.display_name || studentId}</h1>
        <p className="meta">Period: {format(fromDate, "MMM d, yyyy")} – {format(toDate, "MMM d, yyyy")} | Generated: {format(new Date(), "MMM d, yyyy h:mm a")}</p>

        <div className="stats">
          <div className="stat"><div className="stat-val">{totalBlocks}</div><div className="stat-label">Total Blocks</div></div>
          <div className="stat"><div className="stat-val done">{doneBlocks}</div><div className="stat-label">Done</div></div>
          <div className="stat"><div className="stat-val missed">{missedBlocks}</div><div className="stat-label">Missed</div></div>
          <div className="stat"><div className="stat-val">{completionRate}%</div><div className="stat-label">Completion</div></div>
        </div>

        {Object.keys(subjectStats).length > 0 && (
          <>
            <h2>📚 Subject Breakdown</h2>
            <table>
              <thead><tr><th>Subject</th><th>Done</th><th>Total</th><th>Rate</th></tr></thead>
              <tbody>
                {Object.entries(subjectStats).map(([subj, s]) => (
                  <tr key={subj}>
                    <td>{subj}</td>
                    <td>{s.done}</td>
                    <td>{s.total}</td>
                    <td>{s.total > 0 ? Math.round((s.done / s.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>📅 Daily Detail</h2>
        {Object.entries(byDate).map(([date, dayBlocks]) => (
          <div key={date}>
            <h3>{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</h3>
            <table>
              <thead><tr><th>Subject</th><th>Time</th><th>Status</th><th>Score</th><th>Notes</th></tr></thead>
              <tbody>
                {dayBlocks.map(b => (
                  <tr key={b.id}>
                    <td>{b.subject}</td>
                    <td>{b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}</td>
                    <td className={b.status === "Done" ? "done" : b.status === "Missed" ? "missed" : "planned"}>{b.status}</td>
                    <td>{b.time4learning_score != null ? `${b.time4learning_score}%` : "—"}</td>
                    <td>{b.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {checkIns.length > 0 && (
          <>
            <h2>📝 Check-ins</h2>
            {checkIns.map(c => (
              <div key={c.id} className="checkin">
                <strong>{new Date(c.timestamp).toLocaleString()}</strong> — Mood: {c.mood} · Focus: {c.focus} · Blocks done: {c.blocks_done}
                {c.comment && <> · "{c.comment}"</>}
                {c.need_help && <> · ⚠️ Help needed</>}
              </div>
            ))}
          </>
        )}

        <p style={{ marginTop: "24px", fontSize: "10px", color: "#aaa", textAlign: "center" }}>
          Independent Minds EDU v2.0 — Generated automatically
        </p>
      </div>
    </div>
  );
}
