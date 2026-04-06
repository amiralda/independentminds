import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAllRewardsCatalog, useRedemptions, usePointsBalance, useAwardPoints } from "@/hooks/useRewards";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Gift, Coins, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { PointSettingsPanel } from "@/components/PointSettingsPanel";
import { ChallengesPanel } from "@/components/ChallengesPanel";
import { CurrencySettingsPanel } from "@/components/CurrencySettingsPanel";

const EMOJI_OPTIONS = ["🎁", "🎮", "📱", "🍕", "🍦", "🎬", "⚽", "🎨", "📚", "🏖️", "🎵", "🧸", "🎂", "🛍️", "✨", "🎯"];

interface Props {
  studentId: string;
}

export function RewardsManagement({ studentId }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: catalog = [] } = useAllRewardsCatalog(studentId);
  const { data: redemptions = [] } = useRedemptions(studentId);
  const { data: balance = 0 } = usePointsBalance(studentId);
  const awardPoints = useAwardPoints();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(25);
  const [bonusReason, setBonusReason] = useState("");

  const [form, setForm] = useState({ name: "", description: "", point_cost: 50, icon: "🎁", enabled: true });

  const pendingRedemptions = redemptions.filter(r => r.status === "pending");

  const openNew = () => {
    setEditingId(null);
    setForm({ name: "", description: "", point_cost: 50, icon: "🎁", enabled: true });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({ name: r.name, description: r.description || "", point_cost: r.point_cost, icon: r.icon, enabled: r.enabled });
    setDialogOpen(true);
  };

  const saveReward = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    if (editingId) {
      const { error } = await supabase.from("rewards_catalog").update({
        name: form.name, description: form.description || null,
        point_cost: form.point_cost, icon: form.icon, enabled: form.enabled,
      } as any).eq("id", editingId);
      if (error) { toast.error("Failed to update"); return; }
      toast.success(t("rewards.rewardUpdated"));
    } else {
      const { error } = await supabase.from("rewards_catalog").insert({
        student_id: studentId, name: form.name, description: form.description || null,
        point_cost: form.point_cost, icon: form.icon, enabled: form.enabled,
      } as any);
      if (error) { toast.error("Failed to create"); return; }
      toast.success(t("rewards.rewardAdded"));
    }
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["rewards_catalog"] });
    qc.invalidateQueries({ queryKey: ["rewards_catalog_all"] });
  };

  const deleteReward = async (id: string) => {
    const { error } = await supabase.from("rewards_catalog").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted!");
    qc.invalidateQueries({ queryKey: ["rewards_catalog"] });
    qc.invalidateQueries({ queryKey: ["rewards_catalog_all"] });
  };

  const fulfillRedemption = async (id: string) => {
    const { error } = await supabase.from("reward_redemptions").update({
      status: "fulfilled", fulfilled_at: new Date().toISOString(),
    } as any).eq("id", id);
    if (error) { toast.error("Failed"); return; }
    toast.success(t("rewards.rewardFulfilled"));
    qc.invalidateQueries({ queryKey: ["redemptions"] });
  };

  const grantBonus = () => {
    if (!bonusReason.trim() || bonusPoints <= 0) { toast.error("Enter points and reason"); return; }
    awardPoints.mutate(
      { student_id: studentId, points: bonusPoints, reason: bonusReason, source: "parent_bonus" },
      {
        onSuccess: () => {
          toast.success(`+${bonusPoints} bonus points awarded!`);
          setBonusOpen(false);
          setBonusPoints(25);
          setBonusReason("");
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Balance Overview */}
      <div className="rounded-xl bg-gradient-to-r from-secondary/15 to-accent/10 border border-secondary/25 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {t("rewards.studentBalance")}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-display text-3xl font-bold">{balance}</span>
            <Coins size={16} className="text-secondary" />
          </div>
        </div>
        <Button size="sm" variant="secondary" className="font-display" onClick={() => setBonusOpen(true)}>
          <Plus size={14} className="mr-1" /> {t("rewards.bonus")}
        </Button>
      </div>

      {/* Pending Redemptions */}
      {pendingRedemptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            ⏳ {t("rewards.pendingRedemptions")} ({pendingRedemptions.length})
          </p>
          {pendingRedemptions.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{r.points_spent} pts</p>
                <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => fulfillRedemption(r.id)}>
                <CheckCircle size={12} className="mr-1" /> {t("rewards.fulfill")}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Rewards Catalog */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("rewards.catalog")} ({catalog.length})
        </p>
        <Button size="sm" onClick={openNew} className="font-display text-xs">
          <Plus size={12} className="mr-1" /> {t("action.add")}
        </Button>
      </div>

      {catalog.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Gift size={36} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("rewards.addFirst")}</p>
          <p className="text-xs mt-1">{t("rewards.studentCanRedeem")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {catalog.map((r) => (
            <div key={r.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.enabled ? "bg-card" : "bg-muted/50 opacity-60"}`}>
              <span className="text-2xl">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{r.name}</p>
                {r.description && <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>}
              </div>
              <div className="flex items-center gap-1 text-secondary font-bold text-sm flex-shrink-0">
                <Coins size={12} /> {r.point_cost}
              </div>
              <button onClick={() => openEdit(r)} className="text-muted-foreground hover:text-foreground p-1">
                <Pencil size={12} />
              </button>
              <button onClick={() => deleteReward(r.id)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Reward Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId ? t("rewards.editReward") : t("rewards.newReward")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t("rewards.icon")}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setForm(f => ({ ...f, icon: e }))}
                    className={`text-xl p-1.5 rounded-lg border transition-all ${form.icon === e ? "border-primary bg-primary/10 scale-110" : "border-transparent hover:bg-muted"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("student.name")}</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 30 min Screen Time" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details" />
            </div>
            <div>
              <label className="text-sm font-medium">{t("rewards.cost")}</label>
              <Input type="number" min={1} value={form.point_cost} onChange={e => setForm(f => ({ ...f, point_cost: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} id="enabled" />
              <label htmlFor="enabled" className="text-sm">{t("rewards.enabled")}</label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveReward} className="flex-1 font-display">
                {editingId ? t("rewards.update") : t("rewards.addReward")}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}><X size={14} /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bonus Points Dialog */}
      <Dialog open={bonusOpen} onOpenChange={setBonusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {t("rewards.awardBonusPoints")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t("rewards.points")}</label>
              <Input type="number" min={1} value={bonusPoints} onChange={e => setBonusPoints(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("rewards.reason")}</label>
              <Input value={bonusReason} onChange={e => setBonusReason(e.target.value)} placeholder="e.g. Extra homework, great behavior" />
            </div>
            <Button onClick={grantBonus} className="w-full font-display" disabled={awardPoints.isPending}>
              <Coins size={14} className="mr-1" /> {t("rewards.awardPoints")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Currency Settings */}
      <CurrencySettingsPanel />

      {/* Point Settings */}
      <PointSettingsPanel studentId={studentId} />

      {/* Challenges */}
      <ChallengesPanel studentId={studentId} isParent />
    </div>
  );
}
