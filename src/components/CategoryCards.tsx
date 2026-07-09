import { useState } from "react";
import { useSubjectTracks, useActivityLogs, useTrackMutations, type SubjectTrack } from "@/hooks/useSubjectTracks";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, BookOpen, Languages, Code, Music, Palette, Dumbbell, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Languages, Code, Music, Palette, Dumbbell,
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; progress: string }> = {
  primary: { bg: "bg-primary/10", border: "border-primary/30", text: "text-primary", progress: "bg-primary" },
  secondary: { bg: "bg-secondary/10", border: "border-secondary/30", text: "text-secondary", progress: "bg-secondary" },
  info: { bg: "bg-info/10", border: "border-info/30", text: "text-info", progress: "bg-info" },
  success: { bg: "bg-success/10", border: "border-success/30", text: "text-success", progress: "bg-success" },
  warning: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", progress: "bg-warning" },
  accent: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent", progress: "bg-accent" },
  destructive: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", progress: "bg-destructive" },
};

export function CategoryCards() {
  const { profile } = useAuth();
  const studentId = profile?.studentId || null;
  const { data: tracks = [], isLoading: tracksLoading } = useSubjectTracks(studentId);
  const { data: logs = [], isLoading: logsLoading } = useActivityLogs(studentId);
  const { logActivity } = useTrackMutations(studentId || "");

  const [completingTrack, setCompletingTrack] = useState<SubjectTrack | null>(null);
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");

  const enabledTracks = tracks.filter(t => t.enabled);

  const handleMarkDone = async () => {
    if (!completingTrack || !studentId) return;
    try {
      await logActivity.mutateAsync({
        track_id: completingTrack.id,
        status: "Done",
        notes: notes || undefined,
        score: score ? parseInt(score) : undefined,
      });

      // Send Telegram notification
      try {
        const doneToday = logs.filter(l => l.track_id === completingTrack.id && l.status === "Done").length + 1;
        await supabase.functions.invoke("parent-alerts", {
          body: {
            type: "track_completed",
            student_id: studentId,
            track_name: completingTrack.name,
            done_today: doneToday,
            target: completingTrack.daily_target,
            unit_type: completingTrack.unit_type,
          },
        });
      } catch {
        // Silent fail for notification
      }

      toast.success(`${completingTrack.name} marked done! 🎉`);
      setCompletingTrack(null);
      setNotes("");
      setScore("");
    } catch (err: unknown) {
      toast.error("Failed: " + (err.message || "Unknown error"));
    }
  };

  if (tracksLoading || logsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (enabledTracks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target size={36} className="mx-auto mb-3" />
        <p className="font-display text-lg">No learning tracks set up yet</p>
        <p className="text-sm mt-1">Ask your parent to configure your learning tracks!</p>
      </div>
    );
  }

  // Group by category
  const grouped = enabledTracks.reduce<Record<string, SubjectTrack[]>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, catTracks]) => (
        <div key={category}>
          <h3 className="font-display font-semibold text-sm text-muted-foreground mb-2">{category}</h3>
          <div className="space-y-3">
            {catTracks.map((track, i) => {
              const Icon = ICON_MAP[track.icon] || BookOpen;
              const colors = COLOR_MAP[track.color] || COLOR_MAP.primary;
              const doneToday = logs.filter(l => l.track_id === track.id && l.status === "Done").length;
              const progress = Math.min(100, Math.round((doneToday / track.daily_target) * 100));
              const isComplete = doneToday >= track.daily_target;

              return (
                <div
                  key={track.id}
                  className={`rounded-xl border p-4 transition-all animate-slide-up ${colors.bg} ${colors.border} ${
                    isComplete ? "ring-2 ring-success/50" : ""
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      <Icon size={22} className={colors.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-semibold text-base truncate">{track.name}</h4>
                        {isComplete && <CheckCircle2 size={16} className="text-success flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {doneToday}/{track.daily_target} {track.unit_type} today
                      </p>
                    </div>
                    {!isComplete && (
                      <Button
                        size="sm"
                        className="font-display flex-shrink-0"
                        onClick={() => setCompletingTrack(track)}
                      >
                        <CheckCircle2 size={14} className="mr-1" /> Done
                      </Button>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 rounded-full bg-background/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors.progress} ${
                        isComplete ? "shadow-[0_0_8px_rgba(0,0,0,0.15)]" : ""
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-right text-[10px] text-muted-foreground mt-1 font-display">{progress}%</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Mark Done Dialog */}
      <Dialog open={!!completingTrack} onOpenChange={() => setCompletingTrack(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{completingTrack?.name} ✅</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Score (optional)</label>
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
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1"
                rows={2}
                placeholder="What did you work on?"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleMarkDone} disabled={logActivity.isPending} className="flex-1 font-display">
                {logActivity.isPending ? "Saving..." : "Mark Complete"}
              </Button>
              <Button variant="outline" onClick={() => setCompletingTrack(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
