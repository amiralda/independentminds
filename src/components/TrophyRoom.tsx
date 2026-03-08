import { useAchievements } from "@/hooks/useAchievements";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Star, Flame, Award, Lock, Medal, Zap, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ALL_BADGES = [
  { name: "20-Lesson Legend", icon: Flame, desc: "Complete 20 lessons in one day" },
  { name: "Weekly Warrior", icon: Trophy, desc: "Complete 120 lessons in one week" },
  { name: "Chapter Champion", icon: Award, desc: "Finish all activities in a chapter" },
  { name: "First Steps", icon: Star, desc: "Complete your first lesson" },
  { name: "Speed Demon", icon: Zap, desc: "Finish 5 blocks before noon" },
  { name: "Perfect Score", icon: Crown, desc: "Score 100% on a lesson" },
  { name: "Consistency King", icon: Medal, desc: "Complete blocks 5 days in a row" },
  { name: "Subject Master", icon: Star, desc: "Complete 50 lessons in one subject" },
];

export function TrophyRoom() {
  const { profile } = useAuth();
  const studentId = profile?.studentId || null;
  const { data: achievements = [], isLoading } = useAchievements(studentId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  const earnedNames = new Set(achievements.map(a => a.name));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Trophy size={40} className="mx-auto text-secondary mb-2" />
        <h2 className="font-display text-2xl font-bold">Trophy Room</h2>
        <p className="text-muted-foreground text-sm">
          {achievements.length} badge{achievements.length !== 1 ? "s" : ""} earned
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ALL_BADGES.map((badge) => {
          const unlocked = earnedNames.has(badge.name);
          const Icon = unlocked ? badge.icon : Lock;
          const earned = achievements.find(a => a.name === badge.name);

          return (
            <div
              key={badge.name}
              className={`rounded-2xl p-5 text-center transition-all border-2 ${
                unlocked
                  ? "bg-gradient-to-br from-primary to-secondary border-secondary shadow-lg"
                  : "bg-muted/50 border-border opacity-60"
              }`}
            >
              <Icon
                size={36}
                className={`mx-auto mb-2 ${
                  unlocked ? "text-primary-foreground drop-shadow" : "text-muted-foreground"
                }`}
              />
              <h3
                className={`font-display font-semibold text-sm ${
                  unlocked ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {badge.name}
              </h3>
              <p
                className={`text-[10px] mt-1 ${
                  unlocked ? "text-primary-foreground/70" : "text-muted-foreground/70"
                }`}
              >
                {unlocked && earned
                  ? new Date(earned.criteria_met_at).toLocaleDateString()
                  : badge.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent achievements list */}
      {achievements.length > 0 && (
        <div className="rounded-xl bg-card border p-4 shadow-sm">
          <h3 className="font-display font-semibold mb-3">Recent Achievements</h3>
          <div className="space-y-2">
            {achievements.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Trophy size={14} className="text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{a.name}</p>
                  {a.description && (
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.criteria_met_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
