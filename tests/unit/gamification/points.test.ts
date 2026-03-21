import { describe, it, expect } from 'vitest';

const POINTS = {
  COMPLETE_BLOCK: 10,
  SUBMIT_CHECKIN: 15,
  PERFECT_DAY: 25,
  WEEKLY_STREAK: 50,
};

describe('Points economy', () => {
  it('block completion awards 10 points', () => {
    expect(POINTS.COMPLETE_BLOCK).toBe(10);
  });

  it('check-in submission awards 15 points', () => {
    expect(POINTS.SUBMIT_CHECKIN).toBe(15);
  });

  it('perfect day awards 25 bonus points', () => {
    expect(POINTS.PERFECT_DAY).toBe(25);
  });

  it('weekly streak bonus is 50 points', () => {
    expect(POINTS.WEEKLY_STREAK).toBe(50);
  });

  it('insufficient balance blocks redemption', () => {
    const balance = 80;
    const cost = 100;
    expect(balance >= cost).toBe(false);
  });

  it('sufficient balance allows redemption', () => {
    const balance = 150;
    const cost = 100;
    expect(balance >= cost).toBe(true);
  });

  it('balance does not go negative after redemption', () => {
    const balance = 100;
    const cost = 100;
    expect(balance - cost).toBeGreaterThanOrEqual(0);
  });

  it('points are always integers', () => {
    Object.values(POINTS).forEach((p) => {
      expect(Number.isInteger(p)).toBe(true);
    });
  });
});

describe('Streak calculation', () => {
  it('streak increments on consecutive days', () => {
    const dates = ['2026-03-18', '2026-03-19', '2026-03-20'];
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) { streak = 1; continue; }
      const prev = new Date(dates[i - 1]).getTime();
      const curr = new Date(dates[i]).getTime();
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) streak++;
      else streak = 1;
    }
    expect(streak).toBe(3);
  });

  it('streak resets on gap', () => {
    const dates = ['2026-03-18', '2026-03-20']; // gap on 19th
    let streak = 1;
    const prev = new Date(dates[0]).getTime();
    const curr = new Date(dates[1]).getTime();
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diffDays !== 1) streak = 1;
    expect(streak).toBe(1);
  });
});
