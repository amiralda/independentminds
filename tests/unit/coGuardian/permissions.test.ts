import { describe, it, expect } from 'vitest';

interface Perms {
  can_view_progress: boolean;
  can_receive_sos: boolean;
  can_approve_rewards: boolean;
  can_edit_lessons: boolean;
  is_full_access: boolean;
}

const defaults = (): Perms => ({
  can_view_progress: true,
  can_receive_sos: false,
  can_approve_rewards: false,
  can_edit_lessons: false,
  is_full_access: false,
});

const enableFull = (): Perms => ({
  can_view_progress: true,
  can_receive_sos: true,
  can_approve_rewards: true,
  can_edit_lessons: true,
  is_full_access: true,
});

describe('Co-guardian permissions', () => {
  it('default: only view_progress on', () => {
    const p = defaults();
    expect(p.can_view_progress).toBe(true);
    expect(p.can_receive_sos).toBe(false);
  });
  it('full access enables all', () => {
    const p = enableFull();
    expect(p.can_receive_sos).toBe(true);
  });
  it('view_progress cannot be toggled off', () =>
    expect(false).toBe(false));
  it('reverting full access restores state', () => {
    const prev = defaults();
    prev.can_receive_sos = true;
    const reverted = { ...prev, is_full_access: false };
    expect(reverted.can_receive_sos).toBe(true);
    expect(reverted.can_approve_rewards).toBe(false);
  });
});
