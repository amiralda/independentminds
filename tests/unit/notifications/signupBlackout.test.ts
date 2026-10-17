// Rule 6 of hourly-monitor: alert when no account has been created in N days.
//
// Why this rule exists: on 2026-10-17 a TOTAL signup outage was found to have
// been running for 17 days. The Supabase Auth SMTP credential had expired, so
// /signup and /recover both returned 500 — nobody could create an account or
// reset a password. Nothing caught it: a failed signup is rolled back so
// auth.users gains no row, auth.audit_log_entries is empty on this project,
// and the application's own email kept flowing (168 sends, 0 failures) because
// that path is the Resend API, not Auth's SMTP.
//
// The rule measures the absence of success, so these tests pin down both what
// it must catch and — just as important — when it must stay quiet.
import { describe, it, expect } from "vitest";
import { assessSignupBlackout } from "../../../supabase/functions/_shared/monitor-rules.ts";

const NOW = new Date("2026-10-17T12:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe("assessSignupBlackout", () => {
  it("stays quiet when someone signed up inside the window", () => {
    const v = assessSignupBlackout(3, daysAgo(2), NOW, 7);
    expect(v.alert).toBe(false);
    expect(v.daysQuiet).toBe(2);
  });

  it("alerts when the window is empty and the last signup is older than it", () => {
    const v = assessSignupBlackout(0, daysAgo(9), NOW, 7);
    expect(v.alert).toBe(true);
    expect(v.daysQuiet).toBe(9);
  });

  it("would have caught the real outage — 17 days of silence", () => {
    const v = assessSignupBlackout(0, "2026-09-30T17:15:38Z", NOW, 7);
    expect(v.alert).toBe(true);
    expect(v.daysQuiet).toBe(16);
  });

  it("does not alert a brand-new project that has never had a signup", () => {
    // Otherwise the alert fires on day one and never clears until the first
    // user arrives, training the admin to ignore it.
    const v = assessSignupBlackout(0, null, NOW, 7);
    expect(v.alert).toBe(false);
    expect(v.neverAnySignup).toBe(true);
  });

  it("stays quiet on exactly one signup at the edge of the window", () => {
    const v = assessSignupBlackout(1, daysAgo(7), NOW, 7);
    expect(v.alert).toBe(false);
  });

  it("stays quiet rather than alerting on an unparseable timestamp", () => {
    const v = assessSignupBlackout(0, "not-a-date", NOW, 7);
    expect(v.alert).toBe(false);
    expect(v.daysQuiet).toBeNull();
  });

  it("stays quiet on a future timestamp instead of reporting negative days", () => {
    const v = assessSignupBlackout(0, daysAgo(-3), NOW, 7);
    expect(v.alert).toBe(false);
  });

  it("honours a custom threshold", () => {
    expect(assessSignupBlackout(0, daysAgo(4), NOW, 3).alert).toBe(true);
    expect(assessSignupBlackout(0, daysAgo(4), NOW, 30).alert).toBe(true);
    // The count, not the threshold arithmetic, is what gates the alert: the
    // caller queries with the same threshold, so a non-zero count always wins.
    expect(assessSignupBlackout(2, daysAgo(4), NOW, 30).alert).toBe(false);
  });
});
