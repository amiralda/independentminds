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
import { Coins, Gift, History, Star, Zap, Trophy, ShoppingCart, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ChallengesPanel } from "@/components/ChallengesPanel";

const SUGGESTED_REWARDS = [
  { key: "movieNight", icon: "🎬", points: 200 },
  { key: "screenTime", icon: "📱", points: 100 },
  { key: "iceCream", icon: "🍦", points: 150 },
  { key: "stayUpLate", icon: "🌙", points: 80 },
  { key: "chooseDinner", icon: "🍽️", points: 120 },
  { key: "extraGameTime", icon: "🎮", points: 175 },
  { key: "dayTrip", icon: "🏖️", points: 300 },
  { key: "newBook", icon: "📚", points: 130 },
] as const;

export function RewardsPanel() {
  const { lang, t } = useI18n();
  const { profile, selectedStudentId } = useAuth();
  const studentId = profile?.role === "student" ? profile.studentId : selectedStudentId;
  const [sentSuggestions, setSentSuggestions] = useState<Set<string>>(new Set());

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

  const handleSuggest = async (key: string, icon: string, points: number) => {
    if (!studentId || sentSuggestions.has(key)) return;
    const name = t(`rewards.suggestions.${key}`);
    try {
      await supabase.functions.invoke("parent-alerts", {
        body: { type: "reward_suggestion", student_id: studentId, reward_name: name, reward_icon: icon, reward_points: points },
      });
      setSentSuggestions(prev => new Set(prev).add(key));
      toast.success(t("rewards.suggestions.sent"));
    } catch {
      toast.error(lang === "HT" ? "Echèk voye sijesyon" : "Failed to send suggestion");
    }
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

      {/* Active Challenges */}
      <ChallengesPanel studentId={studentId || ""} />

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
            <div className="space-y-4">
              <div className="text-center py-3">
                <Sparkles size={28} className="mx-auto mb-2 text-secondary" />
                <h3 className="font-display font-bold text-base">{t("rewards.empty.inspirationTitle")}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "HT" ? "Tape yon rekonpans pou voye sijesyon bay paran ou!" : "Tap a reward to suggest it to your parent!"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SUGGESTED_REWARDS.map((reward) => {
                  const isSent = sentSuggestions.has(reward.key);
                  return (
                    <button
                      key={reward.key}
                      disabled={isSent}
                      onClick={() => handleSuggest(reward.key, reward.icon, reward.points)}
                      className={`rounded-xl border p-3 flex flex-col items-center text-center space-y-1.5 transition-all ${
                        isSent
                          ? "bg-muted/50 border-muted opacity-60 cursor-not-allowed"
                          : "bg-card border-secondary/20 hover:border-secondary/50 hover:shadow-md active:scale-95"
                      }`}
                    >
                      <span className="text-3xl">{reward.icon}</span>
                      <p className="font-display text-sm font-semibold leading-tight">{t(`rewards.suggestions.${reward.key}`)}</p>
                      <div className="flex items-center gap-1 text-secondary font-bold text-sm">
                        <Coins size={14} /> {reward.points}
                      </div>
                      {isSent ? (
                        <span className="text-[10px] text-muted-foreground">✓ {lang === "HT" ? "Voye" : "Sent"}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Send size={10} /> {lang === "HT" ? "Sijere" : "Suggest"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
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
                    aria-label={`${lang === "HT" ? "Reklame" : "Redeem"} ${reward.name}`}
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
