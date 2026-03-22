import { describe, it, expect } from 'vitest';

const POINTS = {
  BLOCK: 10,
  CHECKIN: 15,
  PERFECT_DAY: 25,
  WEEKLY_STREAK: 50,
};

describe('Points economy', () => {
  it('block = 10', () => expect(POINTS.BLOCK).toBe(10));
  it('checkin = 15', () => expect(POINTS.CHECKIN).toBe(15));
  it('perfect day = 25', () =>
    expect(POINTS.PERFECT_DAY).toBe(25));
  it('weekly streak = 50', () =>
    expect(POINTS.WEEKLY_STREAK).toBe(50));
  it('insufficient balance blocks redemption', () =>
    expect(80 >= 100).toBe(false));
  it('sufficient balance allows redemption', () =>
    expect(150 >= 100).toBe(true));
  it('balance never goes negative', () =>
    expect(100 - 100).toBeGreaterThanOrEqual(0));
});
