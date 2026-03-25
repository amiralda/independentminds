import { useState } from "react";
import { useAllActivityLogs, useSubjectTracks, useTrackMutations, type ActivityLog } from "@/hooks/useSubjectTracks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Undo2, Pencil, Clock, CheckCircle2, XCircle, Play } from "lucide-react";
import { toast } from "sonner";

interface CompletedBlock {
  id: string;
  subject: string;
  status: string;
  actual_start: string | null;
  actual_end: string | null;
  self_rating: number | null;
  time4learning_score: number | null;
  notes: string | null;
}

export function ActivityFeed({ studentId }: { studentId: string }) {
  const { t, lang } = useI18n();
  const { data: logs = [], isLoading: logsLoading } = useAllActivityLogs(studentId);
  const { data: tracks = [] } = useSubjectTracks(studentId);
  const { undoActivity, overrideActivity } = useTrackMutations(studentId);

  // Fallback: show completed daily_plan blocks when activity_logs are empty
  const today = new Date().toISOString().split("T")[0];
  const { data: completedBlocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["completed_blocks_feed", studentId, today],
    queryFn: async (): Promise<CompletedBlock[]> => {
      const { data, error } = await supabase
        .from("daily_plan")
        .select("id, subject, status, actual_start, actual_end, self_rating, time4learning_score, notes")
        .eq("student_id", studentId)
        .eq("plan_date", today)
        .in("status", ["Done", "In Progress"])
        .order("block_order", { ascending: true });
      if (error) throw error;
      return (data as CompletedBlock[]) || [];
    },
    enabled: !!studentId,
  });

  const [editingLog, setEditingLog] = useState<ActivityLog | null>(null);
  const [editStatus, setEditStatus] = useState("Done");
  const [editScore, setEditScore] = useState("");

  const trackMap = tracks.reduce<Record<string, string>>((acc, t) => {
    acc[t.id] = t.name;
    return acc;
  }, {});

  const handleUndo = async (log: ActivityLog) => {
    if (!confirm(lang === "HT" ? "Retire antre aktivite sa a?" : "Remove this activity entry?")) return;
    try {
      await undoActivity.mutateAsync(log.id);
      toast.success(lang === "HT" ? "Antre retire" : "Activity entry removed");
    } catch {
      toast.error(lang === "HT" ? "Echèk" : "Failed to undo");
    }
  };

  const handleOverride = async () => {
    if (!editingLog) return;
    try {
      await overrideActivity.mutateAsync({
        id: editingLog.id,
        status: editStatus,
        score: editScore ? parseInt(editScore) : undefined,
      });
      toast.success(lang === "HT" ? "Aktivite korije" : "Activity overridden");
      setEditingLog(null);
    } catch {
      toast.error(lang === "HT" ? "Echèk" : "Failed to override");
    }
  };

  const openOverride = (log: ActivityLog) => {
    setEditingLog(log);
    setEditStatus(log.status);
    setEditScore(log.score?.toString() || "");
  };

  if (logsLoading || blocksLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  // Use activity_logs if available, otherwise show completed daily_plan blocks
  const hasActivityLogs = logs.length > 0;

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-lg">
        {lang === "HT" ? "Aktivite Jodi a" : "Today's Activity Feed"}
      </h3>

      {hasActivityLogs ? (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
              {log.status === "Done" ? (
                <CheckCircle2 size={16} className="text-success flex-shrink-0" />
              ) : (
                <XCircle size={16} className="text-destructive flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{trackMap[log.track_id] || "Unknown Track"}</p>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  {log.started_at && (
                    <span>{lang === "HT" ? "Kòmanse" : "Started"}: {new Date(log.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                  {log.completed_at && (
                    <span>{lang === "HT" ? "Fini" : "Completed"}: {new Date(log.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                  {log.score != null && <span>Score: {log.score}%</span>}
                </div>
                {log.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{log.notes}"</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                log.status === "Done" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
              }`}>{log.status}</span>
              <button onClick={() => openOverride(log)} className="text-muted-foreground hover:text-primary p-1" title="Override">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleUndo(log)} className="text-muted-foreground hover:text-destructive p-1" title="Undo">
                <Undo2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : completedBlocks.length > 0 ? (
        <div className="space-y-2">
          {completedBlocks.map(block => (
            <div key={block.id} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
              {block.status === "Done" ? (
                <CheckCircle2 size={16} className="text-success flex-shrink-0" />
              ) : (
                <Play size={16} className="text-warning flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{block.subject}</p>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  {block.actual_start && (
                    <span>{lang === "HT" ? "Kòmanse" : "Started"}: {new Date(block.actual_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                  {block.actual_end && (
                    <span>{lang === "HT" ? "Fini" : "Completed"}: {new Date(block.actual_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                  {block.self_rating != null && <span>⭐ {block.self_rating}/5</span>}
                  {block.time4learning_score != null && <span>Score: {block.time4learning_score}%</span>}
                </div>
                {block.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{block.notes}"</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                block.status === "Done" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
              }`}>{block.status === "Done" ? (lang === "HT" ? "Fini" : "Done") : (lang === "HT" ? "Ap fè" : "In Progress")}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Clock size={36} className="mx-auto mb-3" />
          <p className="font-display">{lang === "HT" ? "Pa gen aktivite jodi a" : "No activities logged today"}</p>
        </div>
      )}

      {/* Override Dialog */}
      <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {lang === "HT" ? "Korije Aktivite" : "Override Activity"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Track</label>
              <p className="text-sm text-muted-foreground">{editingLog ? trackMap[editingLog.track_id] || "Unknown" : ""}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Missed">Missed</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Score ({lang === "HT" ? "opsyonèl" : "optional"})</label>
              <Input type="number" min={0} max={100} value={editScore}
                onChange={e => setEditScore(e.target.value)} placeholder="0-100" />
            </div>
            <Button onClick={handleOverride} disabled={overrideActivity.isPending} className="w-full font-display">
              {overrideActivity.isPending ? (lang === "HT" ? "Ap anrejistre..." : "Saving...") : (lang === "HT" ? "Anrejistre" : "Save Override")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}