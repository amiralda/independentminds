// Global badge template. Must match the server triggers in
// 20260924170000_rewards_points_badges.sql (award_point_badges /
// award_checkin_badges): the badge_type keys and thresholds are the contract.

export interface BadgeDef {
  key: string;
  emoji: string;
  /** Lifetime points needed; null for action badges. */
  threshold: number | null;
}

export const BADGES: BadgeDef[] = [
  { key: "points_50", emoji: "🌱", threshold: 50 },
  { key: "points_150", emoji: "🥉", threshold: 150 },
  { key: "points_400", emoji: "🥈", threshold: 400 },
  { key: "points_1000", emoji: "🥇", threshold: 1000 },
  { key: "checkin_streak_7", emoji: "🔥", threshold: null },
];

export function badgeDef(key: string): BadgeDef | undefined {
  return BADGES.find((b) => b.key === key);
}

export const badgeLabelKey = (key: string) => `badge.${key}`;

/** Next points badge not yet reached, or null when Gold is done. */
export function nextPointsBadge(totalPoints: number): BadgeDef | null {
  return BADGES.find((b) => b.threshold !== null && totalPoints < b.threshold) ?? null;
}
