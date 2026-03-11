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
import { useCheckAndAwardBadges } from "@/hooks/useAchievements";
import { useAuth } from "@/contexts/AuthContext";
import { StudentRecords } from "@/components/StudentRecords";

interface Block {
  id: string;
  block_order: number;
  start_time: string;
  end_time: string;
  subject: string;
  status: string;
  self_rating: number | null;
  notes: string | null;
  time4learning_score: number | null;
  actual_start: string | null;
  actual_end: string | null;
  map_id: string | null;
}

interface Props {
  blocks: Block[];
  onRefresh: () => void;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "Done": return <CheckCircle2 size={18} className="text-success" />;
    case "In Progress": return <Play size={18} className="text-warning animate-pulse-gentle" />;
    case "Missed": return <AlertCircle size={18} className="text-destructive" />;
    default: return <Clock size={18} className="text-muted-foreground" />;
  }
};

export function TodayBlocks({ blocks, onRefresh }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const checkBadges = useCheckAndAwardBadges(profile?.studentId || "CHRIS");
  const [completingBlock, setCompletingBlock] = useState<Block | null>(null);
  const [showRecords, setShowRecords] = useState(false);
  const [rating, setRating] = useState(3);
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");

  const handleStart = async (block: Block) => {
    const now = new Date().toISOString();
    await supabase.from("daily_plan").update({
      status: "In Progress",
      actual_start: now,
    }).eq("id", block.id);

    // Also log to activity_logs if a matching track exists
    const studentId = profile?.studentId;
    if (studentId) {
      const { data: tracks } = await supabase
        .from("subject_tracks")
        .select("id")
        .eq("student_id", studentId)
        .ilike("name", block.subject)
        .limit(1);
      if (tracks && tracks.length > 0) {
        await supabase.from("activity_logs").insert({
          student_id: studentId,
          track_id: tracks[0].id,
          status: "In Progress",
          started_at: now,
        } as any);
      }
    }

    toast.success(t("status.inProgress"));
    onRefresh();
    queryClient.invalidateQueries({ queryKey: ["activity_logs_all"] });
  };

  const handleMarkDone = (block: Block) => {
    setCompletingBlock(block);
    setRating(3);
    setScore("");
    setNotes("");
  };

  const handleSubmitDone = async () => {
    if (!completingBlock) return;
    const now = new Date().toISOString();
    await supabase.from("daily_plan").update({
      status: "Done",
      actual_end: now,
      self_rating: rating,
      time4learning_score: score ? parseInt(score) : null,
      notes: notes || null,
    }).eq("id", completingBlock.id);

    // Also log to activity_logs if a matching track exists
    const studentId = profile?.studentId;
    if (studentId) {
      const { data: tracks } = await supabase
        .from("subject_tracks")
        .select("id")
        .eq("student_id", studentId)
        .ilike("name", completingBlock.subject)
        .limit(1);
      if (tracks && tracks.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        // Check if there's an existing "In Progress" log for this track today
        const { data: existing } = await supabase
          .from("activity_logs")
          .select("id")
          .eq("student_id", studentId)
          .eq("track_id", tracks[0].id)
          .eq("log_date", today)
          .eq("status", "In Progress")
          .limit(1);

        if (existing && existing.length > 0) {
          // Update the existing entry
          await supabase.from("activity_logs").update({
            status: "Done",
            completed_at: now,
            score: score ? parseInt(score) : null,
            notes: notes || null,
          } as any).eq("id", existing[0].id);
        } else {
          // Insert a new completed entry
          await supabase.from("activity_logs").insert({
            student_id: studentId,
            track_id: tracks[0].id,
            status: "Done",
            started_at: completingBlock.actual_start || now,
            completed_at: now,
            score: score ? parseInt(score) : null,
            notes: notes || null,
          } as any);
        }
      }
    }

    toast.success(t("status.done") + " 🎉");
    setCompletingBlock(null);
    onRefresh();
    checkBadges.mutate();
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
                {block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)} | Block {block.block_order}
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
          {block.status === "Done" && block.self_rating && (
            <div className="mt-2 flex gap-2 text-sm text-muted-foreground">
              <span>{"⭐".repeat(block.self_rating)}</span>
              {block.time4learning_score != null && <span>Score: {block.time4learning_score}%</span>}
            </div>
          )}
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
              <label className="text-sm font-medium">{t("rating")}</label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    className={`w-10 h-10 rounded-lg font-display text-lg transition-all ${
                      r <= rating
                        ? "bg-warning text-warning-foreground shadow-sm scale-110"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
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
              <Button onClick={handleSubmitDone} className="flex-1 font-display">{t("save")}</Button>
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
          {profile?.studentId && <StudentRecords studentId={profile.studentId} />}
          {!profile?.studentId && <p className="text-muted-foreground text-sm">No student selected.</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
