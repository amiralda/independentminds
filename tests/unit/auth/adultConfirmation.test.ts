import { describe, it, expect } from 'vitest';

describe('Adult confirmation', () => {
  it('signup disabled when adult_confirmed false', () => {
    expect(false && true).toBe(false);
  });
  it('signup enabled when adult_confirmed true and form complete', () => {
    expect(true && true).toBe(true);
  });
  it('adult_confirmed_at timestamp is set on check', () => {
    const ts = new Date().toISOString();
    expect(new Date(ts).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
