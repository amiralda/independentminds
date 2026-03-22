import { describe, it, expect } from 'vitest';

const MILESTONES = [3, 7, 14, 21, 30, 60, 90];

interface BadgeConfig {
  name: string;
  milestone: number;
  icon: string;
}

const BADGES: BadgeConfig[] = [
  { name: '3-Day Starter', milestone: 3, icon: '🌱' },
  { name: '7-Day Streak', milestone: 7, icon: '🔥' },
  { name: '14-Day Warrior', milestone: 14, icon: '⚔️' },
  { name: '21-Day Champion', milestone: 21, icon: '🏆' },
  { name: '30-Day Legend', milestone: 30, icon: '👑' },
  { name: '60-Day Master', milestone: 60, icon: '🌟' },
  { name: '90-Day Hero', milestone: 90, icon: '🦸' },
];

const earnedBadges = (streak: number) =>
  BADGES.filter((b) => streak >= b.milestone);

describe('Badge system', () => {
  it('covers all milestones', () =>
    expect(BADGES.map((b) => b.milestone)).toEqual(MILESTONES));
  it('no badges at streak 0', () =>
    expect(earnedBadges(0)).toHaveLength(0));
  it('1 badge at streak 3', () =>
    expect(earnedBadges(3)).toHaveLength(1));
  it('all badges at streak 90', () =>
    expect(earnedBadges(90)).toHaveLength(7));
  it('badge names are unique', () => {
    const names = BADGES.map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
  });
  it('badge icons are unique', () => {
    const icons = BADGES.map((b) => b.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
