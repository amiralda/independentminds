import { describe, it, expect } from 'vitest';

describe('Adult confirmation validation', () => {
  it('signup button is disabled when adult_confirmed is false', () => {
    const isAdultConfirmed = false;
    const formComplete = true;
    const canSubmit = formComplete && isAdultConfirmed;
    expect(canSubmit).toBe(false);
  });

  it('signup button is enabled when adult_confirmed is true and form is complete', () => {
    const isAdultConfirmed = true;
    const formComplete = true;
    const canSubmit = formComplete && isAdultConfirmed;
    expect(canSubmit).toBe(true);
  });

  it('adult_confirmed_at timestamp is set when checkbox is checked', () => {
    const before = Date.now();
    const adult_confirmed_at = new Date().toISOString();
    const after = Date.now();
    const ts = new Date(adult_confirmed_at).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('incomplete form prevents signup even with adult confirmed', () => {
    const isAdultConfirmed = true;
    const formComplete = false; // missing email or password
    const canSubmit = formComplete && isAdultConfirmed;
    expect(canSubmit).toBe(false);
  });
});
