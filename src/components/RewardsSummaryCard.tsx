import { Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useStudentRewards } from "@/hooks/useStudentRewards";
import { badgeDef, badgeLabelKey, nextPointsBadge } from "@/lib/badges";
import { Skeleton } from "@/components/ui/skeleton";

// Read-only: total points earned + badges. Points and badges are written
// server-side only; RLS limits reads to the student and their family.
export function RewardsSummaryCard({ studentId }: { studentId: string }) {
  const { t } = useI18n();
  const { data, isLoading } = useStudentRewards(studentId);

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (!data) return null;

  const next = nextPointsBadge(data.totalPoints);

  return (
    <section aria-labelledby="rewards-card-title" className="rounded-xl bg-card border p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="rewards-card-title" className="font-display font-semibold flex items-center gap-2">
          <Trophy size={18} className="text-warning" /> {t("rewardsCard.title")}
        </h3>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-primary leading-none" data-testid="rewards-total">{data.totalPoints}</p>
          <p className="text-[10px] text-muted-foreground">{t("rewardsCard.totalPoints")}</p>
        </div>
      </div>

      {data.badges.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("rewardsCard.noBadges")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid="rewards-badges">
          {data.badges.map((b) => (
            <li
              key={b.badge_type}
              className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 text-sm font-medium"
              title={b.badge_type === "checkin_streak_7" ? t("badge.checkin_streak_7.desc") : undefined}
            >
              <span aria-hidden="true">{badgeDef(b.badge_type)?.emoji ?? "🏅"}</span>
              {t(badgeLabelKey(b.badge_type))}
            </li>
          ))}
        </ul>
      )}

      {next && next.threshold !== null && (
        <p className="text-xs text-muted-foreground">
          {t("rewardsCard.nextBadge")}: {next.emoji} {t(badgeLabelKey(next.key))} — {data.totalPoints}/{next.threshold}
        </p>
      )}
    </section>
  );
}
