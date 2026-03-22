import { describe, it, expect } from 'vitest';

const MILESTONES = [3, 7, 14, 21, 30, 60, 90];
const earned = (n: number) => MILESTONES.filter((m) => n >= m);
const next = (n: number) =>
  MILESTONES.find((m) => m > n) ?? null;

describe('Streak milestones', () => {
  it('no badges at 0', () =>
    expect(earned(0)).toHaveLength(0));
  it('3-day badge at 3', () =>
    expect(earned(3)).toContain(3));
  it('two badges at 7', () => {
    expect(earned(7)).toContain(3);
    expect(earned(7)).toContain(7);
  });
  it('all badges at 90', () =>
    expect(earned(90)).toEqual(MILESTONES));
  it('next after 7 is 14', () => expect(next(7)).toBe(14));
  it('no next after 90', () => expect(next(90)).toBeNull());
});

function calcVelocity(
  total: number,
  done: number,
  days: number
) {
  return days <= 0 ? 0 : (total - done) / days;
}

function paceStatus(v: number, req: number) {
  const r = v / req;
  if (r >= 1.1) return 'ahead';
  if (r >= 0.95) return 'on_track';
  if (r >= 0.75) return 'slightly_behind';
  return 'off_track';
}

describe('Velocity & pace', () => {
  it('calculates velocity', () =>
    expect(calcVelocity(200, 100, 50)).toBe(2));
  it('0 days remaining = 0', () =>
    expect(calcVelocity(200, 100, 0)).toBe(0));
  it('ahead at 110%', () =>
    expect(paceStatus(12, 10)).toBe('ahead'));
  it('on_track at 100%', () =>
    expect(paceStatus(10, 10)).toBe('on_track'));
  it('slightly_behind at 80%', () =>
    expect(paceStatus(8, 10)).toBe('slightly_behind'));
  it('off_track at 50%', () =>
    expect(paceStatus(5, 10)).toBe('off_track'));
});
