import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useChallenges, useCreateChallenge, useDeleteChallenge } from "@/hooks/useChallenges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Trash2, Trophy, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  studentId: string;
  isParent?: boolean;
}

export function ChallengesPanel({ studentId, isParent = false }: Props) {
  const { t } = useI18n();
  const { data: challenges = [] } = useChallenges(studentId);
  const createChallenge = useCreateChallenge();
  const deleteChallenge = useDeleteChallenge();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    target_count: 5,
    bonus_points: 50,
    subject_filter: "",
    category_filter: "",
  });

  const activeChallenges = challenges.filter(c => c.status === "active");
  const completedChallenges = challenges.filter(c => c.status === "completed");

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    createChallenge.mutate(
      {
        student_id: studentId,
        title: form.title,
        description: form.description || undefined,
        target_count: form.target_count,
        bonus_points: form.bonus_points,
        subject_filter: form.subject_filter || undefined,
        category_filter: form.category_filter || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("challenges.created"));
          setDialogOpen(false);
          setForm({ title: "", description: "", target_count: 5, bonus_points: 50, subject_filter: "", category_filter: "" });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-primary" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("challenges.title")}
          </p>
        </div>
        {isParent && (
          <Button size="sm" onClick={() => setDialogOpen(true)} className="font-display text-xs">
            <Plus size={12} className="mr-1" /> {t("challenges.new")}
          </Button>
        )}
      </div>

      {/* Active Challenges */}
      {activeChallenges.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Target size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {t("challenges.noActive")}
          </p>
          {isParent && (
            <p className="text-xs mt-1">
              {t("challenges.motivate")}
            </p>
          )}
        </div>
      )}

      {activeChallenges.map(ch => {
        const progress = ch.target_count > 0 ? Math.round((ch.current_count / ch.target_count) * 100) : 0;
        const daysLeft = Math.max(0, Math.ceil((new Date(ch.ends_at).getTime() - Date.now()) / 86400000));
        return (
          <div key={ch.id} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm">{ch.title}</p>
                {ch.description && <p className="text-[10px] text-muted-foreground">{ch.description}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock size={12} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{daysLeft}d</span>
                {isParent && (
                  <button onClick={() => deleteChallenge.mutate(ch.id)} className="text-muted-foreground hover:text-destructive p-0.5">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="flex-1 h-2" />
              <span className="text-xs font-medium text-muted-foreground">
                {ch.current_count}/{ch.target_count}
              </span>
            </div>
            <div className="flex items-center gap-1 text-secondary text-xs font-bold">
              <Trophy size={12} /> +{ch.bonus_points} {t("challenges.pts")}
              {ch.subject_filter && <span className="text-muted-foreground font-normal ml-2">📚 {ch.subject_filter}</span>}
              {ch.category_filter && <span className="text-muted-foreground font-normal ml-2">📂 {ch.category_filter}</span>}
            </div>
          </div>
        );
      })}

      {/* Completed */}
      {completedChallenges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            ✅ {t("challenges.completed")} ({completedChallenges.length})
          </p>
          {completedChallenges.slice(0, 5).map(ch => (
            <div key={ch.id} className="flex items-center gap-2 bg-success/10 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} className="text-success" />
              <p className="text-sm font-medium flex-1 truncate">{ch.title}</p>
              <span className="text-xs font-bold text-success">+{ch.bonus_points}</span>
            </div>
          ))}
        </div>
      )}

      {/* Create Challenge Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {t("challenges.newChallenge")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t("challenges.titleLabel")}</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Complete 5 Science lessons" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t("challenges.target")}</label>
                <Input type="number" min={1} value={form.target_count} onChange={e => setForm(f => ({ ...f, target_count: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label className="text-sm font-medium">{t("challenges.bonusPoints")}</label>
                <Input type="number" min={1} value={form.bonus_points} onChange={e => setForm(f => ({ ...f, bonus_points: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t("challenges.subject")}</label>
                <Input value={form.subject_filter} onChange={e => setForm(f => ({ ...f, subject_filter: e.target.value }))} placeholder="e.g. Math" />
              </div>
              <div>
                <label className="text-sm font-medium">{t("challenges.category")}</label>
                <Input value={form.category_filter} onChange={e => setForm(f => ({ ...f, category_filter: e.target.value }))} placeholder="e.g. Core Academics" />
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full font-display" disabled={createChallenge.isPending}>
              <Target size={14} className="mr-1" /> {t("challenges.createBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
