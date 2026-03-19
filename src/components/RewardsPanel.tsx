import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePointsBalance,
  usePointsHistory,
  useRewardsCatalog,
  useRedemptions,
  useRedeemReward,
  POINT_VALUES,
} from "@/hooks/useRewards";
import { Button } from "@/components/ui/button";
import { Coins, Gift, History, Star, Zap, Trophy, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RewardsPanel() {
  const { lang } = useI18n();
  const { profile, selectedStudentId } = useAuth();
  const studentId = profile?.role === "student" ? profile.studentId : selectedStudentId;

  const { data: balance = 0 } = usePointsBalance(studentId || null);
  const { data: history = [] } = usePointsHistory(studentId || null);
  const { data: catalog = [] } = useRewardsCatalog(studentId || null);
  const { data: redemptions = [] } = useRedemptions(studentId || null);
  const redeemMutation = useRedeemReward();

  const handleRedeem = (reward: { id: string; name: string; point_cost: number }) => {
    if (!studentId) return;
    if (balance < reward.point_cost) {
      toast.error(lang === "HT" ? "Pa gen ase pwen!" : "Not enough points!");
      return;
    }
    redeemMutation.mutate(
      { student_id: studentId, reward_id: reward.id, points_spent: reward.point_cost, reward_name: reward.name },
      { onSuccess: () => toast.success(lang === "HT" ? `${reward.name} reklame!` : `${reward.name} redeemed! 🎉`) }
    );
  };

  return (
    <div className="space-y-4">
      {/* Points Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-secondary/20 via-secondary/10 to-accent/10 border border-secondary/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {lang === "HT" ? "Balans Pwen" : "Points Balance"}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-4xl font-bold text-secondary-foreground">{balance}</span>
              <Coins size={20} className="text-secondary" />
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
            <Star size={32} className="text-secondary" />
          </div>
        </div>

        {/* How to earn */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <EarnBadge icon={Zap} label={lang === "HT" ? "Blòk" : "Block"} points={POINT_VALUES.BLOCK_COMPLETED} />
          <EarnBadge icon={Trophy} label={lang === "HT" ? "Tcheke" : "Check-in"} points={POINT_VALUES.CHECK_IN} />
          <EarnBadge icon={Star} label={lang === "HT" ? "Jou pafè" : "Perfect Day"} points={POINT_VALUES.PERFECT_DAY} />
        </div>
      </div>

      <Tabs defaultValue="shop">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="shop" className="font-display text-xs">
            <ShoppingCart size={12} className="mr-1" /> {lang === "HT" ? "Boutik" : "Shop"}
          </TabsTrigger>
          <TabsTrigger value="history" className="font-display text-xs">
            <History size={12} className="mr-1" /> {lang === "HT" ? "Istwa" : "History"}
          </TabsTrigger>
          <TabsTrigger value="redeemed" className="font-display text-xs">
            <Gift size={12} className="mr-1" /> {lang === "HT" ? "Reklame" : "Redeemed"}
          </TabsTrigger>
        </TabsList>

        {/* Rewards Shop */}
        <TabsContent value="shop" className="mt-3">
          {catalog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift size={40} className="mx-auto mb-2 opacity-40" />
              <p className="font-display text-sm">
                {lang === "HT" ? "Pa gen rekonpans ankò" : "No rewards available yet"}
              </p>
              <p className="text-xs mt-1">
                {lang === "HT" ? "Mande paran ou ajoute rekonpans!" : "Ask your parent to add rewards!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {catalog.map((reward) => (
                <div
                  key={reward.id}
                  className="rounded-xl bg-card border p-3 flex flex-col items-center text-center space-y-2"
                >
                  <span className="text-3xl">{reward.icon}</span>
                  <p className="font-display text-sm font-semibold leading-tight">{reward.name}</p>
                  {reward.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{reward.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-secondary font-bold text-sm">
                    <Coins size={14} /> {reward.point_cost}
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-xs font-display"
                    disabled={balance < reward.point_cost || redeemMutation.isPending}
                    onClick={() => handleRedeem(reward)}
                    variant={balance >= reward.point_cost ? "default" : "outline"}
                  >
                    {balance >= reward.point_cost
                      ? (lang === "HT" ? "Reklame" : "Redeem")
                      : (lang === "HT" ? "Bezwen plis" : "Need more")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Points History */}
        <TabsContent value="history" className="mt-3">
          {history.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {lang === "HT" ? "Pa gen pwen ankò" : "No points earned yet"}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{tx.reason}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-display font-bold text-sm ${tx.points > 0 ? "text-success" : "text-destructive"}`}>
                    {tx.points > 0 ? "+" : ""}{tx.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Redeemed */}
        <TabsContent value="redeemed" className="mt-3">
          {redemptions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {lang === "HT" ? "Pa gen reklame ankò" : "No redemptions yet"}
            </p>
          ) : (
            <div className="space-y-2">
              {redemptions.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{r.points_spent} pts</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.status === "fulfilled" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                  }`}>
                    {r.status === "fulfilled" ? "✅" : "⏳"} {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EarnBadge({ icon: Icon, label, points }: { icon: React.ElementType; label: string; points: number }) {
  return (
    <div className="rounded-lg bg-card/60 border border-secondary/20 px-2 py-1.5 text-center">
      <Icon size={14} className="mx-auto text-secondary mb-0.5" />
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="text-xs font-bold text-secondary-foreground">+{points}</p>
    </div>
  );
}
