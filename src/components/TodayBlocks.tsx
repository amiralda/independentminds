import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { SubjectIcon, getSubjectColor } from "@/components/SubjectIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Play, Clock, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { StudentRecords } from "@/components/StudentRecords";
import type { Block } from "@/hooks/useDailyBlocks";
import { formatTimeRange } from "@/lib/dailyPlan";

interface Props {
  blocks: Block[];
  onRefresh: () => void;
  studentId: string | null;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "Done": return <CheckCircle2 size={18} className="text-success" />;
    case "In Progress": return <Play size={18} className="text-warning animate-pulse-gentle" />;
    case "Missed": return <AlertCircle size={18} className="text-destructive" />;
    default: return <Clock size={18} className="text-muted-foreground" />;
  }
};

export function TodayBlocks({ blocks, onRefresh, studentId }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [completingBlock, setCompletingBlock] = useState<Block | null>(null);
  const [showRecords, setShowRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");

  // Map daily_plan subjects to the best matching subject_track
  const findTrackForSubject = async (subject: string, sid: string): Promise<string | null> => {
    // 1. Try exact name match first
    const { data: exact } = await supabase
      .from("subject_tracks")
      .select("id")
      .eq("student_id", sid)
      .ilike("name", subject)
      .eq("enabled", true)
      .limit(1);
    if (exact && exact.length > 0) return exact[0].id;

    // 2. Try partial name match (subject contained in track name or vice versa)
    const { data: allTracks } = await supabase
      .from("subject_tracks")
      .select("id, name, category")
      .eq("student_id", sid)
      .eq("enabled", true);
    if (!allTracks || allTracks.length === 0) return null;

    const subjectLower = subject.toLowerCase();

    // Partial match: track name contains subject or subject contains track name
    const partial = allTracks.find(
      t => t.name.toLowerCase().includes(subjectLower) || subjectLower.includes(t.name.toLowerCase())
    );
    if (partial) return partial.id;

    // 3. Category-based mapping
    const SUBJECT_CATEGORY_MAP: Record<string, string[]> = {
      'core academics': ['english', 'math', 'science', 'social studies', 'public speaking', 'media education', 'english support'],
      'language lab': ['esl', 'language arts', 'languages', 'french', 'spanish', 'kreyòl'],
      'creative arts': ['art', 'music', 'special projects', 'drama'],
    };

    for (const [category, subjects] of Object.entries(SUBJECT_CATEGORY_MAP)) {
      if (subjects.includes(subjectLower)) {
        const match = allTracks.find(t => t.category.toLowerCase() === category);
        if (match) return match.id;
      }
    }

    // 4. Fall back to first enabled track
    return allTracks[0].id;
  };

  const handleStart = async (block: Block) => {
    const now = new Date().toISOString();
    // DB statuses are planned/started/done (CHECK constraint).
    const { error } = await supabase.from("daily_plan").update({
      status: "started",
      actual_start: now,
    }).eq("id", block.id);
    if (error) {
      console.error("Start block failed", error);
      toast.error(t("blocks.saveFailed"));
      return;
    }

    if (studentId) {
      const trackId = await findTrackForSubject(block.subject, studentId);
      if (trackId) {
        await supabase.from("activity_logs").insert({
          student_id: studentId,
          track_id: trackId,
          status: "In Progress",
          started_at: now,
          notes: block.subject,
        } as any);
      }
    }

    toast.success(t("status.inProgress"));
    onRefresh();
    queryClient.invalidateQueries({ queryKey: ["activity_logs_all"] });
  };

  const handleMarkDone = (block: Block) => {
    setCompletingBlock(block);
    setScore("");
    setNotes("");
  };

  const handleSubmitDone = async () => {
    if (!completingBlock || saving) return;
    const now = new Date().toISOString();
    setSaving(true);
    // Only status + timestamp exist on daily_plan; score/notes go to
    // activity_logs below. Points are awarded server-side by the
    // award_task_points trigger (once per task), badges by award_point_badges.
    const { error } = await supabase.from("daily_plan").update({
      status: "done",
      actual_end: now,
    }).eq("id", completingBlock.id);
    setSaving(false);
    if (error) {
      console.error("Mark done failed", error);
      toast.error(t("blocks.saveFailed"));
      return;
    }

    // Also log to activity_logs
    if (studentId) {
      const trackId = await findTrackForSubject(completingBlock.subject, studentId);
      if (trackId) {
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("activity_logs")
          .select("id")
          .eq("student_id", studentId)
          .eq("track_id", trackId)
          .eq("log_date", today)
          .eq("status", "In Progress")
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase.from("activity_logs").update({
            status: "Done",
            completed_at: now,
            score: score ? parseInt(score) : null,
            notes: completingBlock.subject + (notes ? ` — ${notes}` : ''),
          } as any).eq("id", existing[0].id);
        } else {
          await supabase.from("activity_logs").insert({
            student_id: studentId,
            track_id: trackId,
            status: "Done",
            started_at: completingBlock.actual_start || now,
            completed_at: now,
            score: score ? parseInt(score) : null,
            notes: completingBlock.subject + (notes ? ` — ${notes}` : ''),
          } as any);
        }
      }
    }

    toast.success(t("status.done") + " 🎉");
    setCompletingBlock(null);
    onRefresh();
    queryClient.invalidateQueries({ queryKey: ["activity_logs_all"] });
    queryClient.invalidateQueries({ queryKey: ["points_balance"] });
    queryClient.invalidateQueries({ queryKey: ["points_history"] });
    queryClient.invalidateQueries({ queryKey: ["achievements"] });
    queryClient.invalidateQueries({ queryKey: ["student_rewards"] });
  };

  const doneCount = blocks.filter(b => b.status === "Done").length;
  const progress = blocks.length > 0 ? Math.round((doneCount / blocks.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar + Records button */}
      <div className="rounded-xl bg-card p-4 shadow-sm border">
        <div className="flex justify-between text-sm font-medium mb-2">
          <span>{t("blocks.done")}: {doneCount}/{blocks.length}</span>
          <span className="font-display text-primary">{progress}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full font-display text-xs"
          onClick={() => setShowRecords(true)}
        >
          <FileText size={14} className="mr-1" /> View Records & Print
        </Button>
      </div>

      {/* Blocks */}
      {blocks.map((block, i) => (
        <div
          key={block.id}
          className={`rounded-xl border p-4 transition-all animate-slide-up ${getSubjectColor(block.subject)} ${
            block.status === "In Progress" ? "ring-2 ring-warning shadow-md" : ""
          }`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <SubjectIcon subject={block.subject} size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {statusIcon(block.status)}
                <h3 className="font-display font-semibold text-lg truncate">{block.subject}</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatTimeRange(block) ? `${formatTimeRange(block)} | ` : ""}Block {block.block_order}
              </p>
              {block.notes && (
                <p className="text-xs mt-1 bg-background/60 rounded px-2 py-1 text-foreground/80">
                  📍 {block.notes}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {block.status === "Planned" && (
                <Button size="sm" onClick={() => handleStart(block)} className="font-display">
                  <Play size={14} className="mr-1" /> {t("action.start")}
                </Button>
              )}
              {(block.status === "Planned" || block.status === "In Progress") && (
                <Button size="sm" variant="secondary" onClick={() => handleMarkDone(block)} className="font-display">
                  <CheckCircle2 size={14} className="mr-1" /> {t("action.markDone")}
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      {blocks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-display text-xl">No blocks scheduled for today</p>
          <p className="text-sm mt-1">Pa gen blòk pou jodi a</p>
        </div>
      )}

      {/* Completion dialog */}
      <Dialog open={!!completingBlock} onOpenChange={() => setCompletingBlock(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{completingBlock?.subject} ✅</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("score")}</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={e => setScore(e.target.value)}
                placeholder="0-100"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("notes")}</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmitDone} disabled={saving} className="flex-1 font-display">{t("save")}</Button>
              <Button variant="outline" onClick={() => setCompletingBlock(null)}>{t("cancel")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Records dialog */}
      <Dialog open={showRecords} onOpenChange={setShowRecords}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">📄 Student Records</DialogTitle>
          </DialogHeader>
          {studentId && <StudentRecords studentId={studentId} />}
          {!studentId && <p className="text-muted-foreground text-sm">No student selected.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
