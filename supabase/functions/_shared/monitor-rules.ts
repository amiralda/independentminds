// Pure decision logic for hourly-monitor rules, kept out of the handler so it
// can be unit tested without a Supabase client. Same arrangement as
// _shared/article-generation.ts.

export interface SignupBlackoutVerdict {
  /** True when an alert should be raised. */
  alert: boolean;
  /** Whole days since the last signup; null when there has never been one. */
  daysQuiet: number | null;
  /** True when the project has never had a signup at all. */
  neverAnySignup: boolean;
}

/**
 * Decides whether to raise a "no new signups" alert.
 *
 * Background: on 2026-10-17 a total signup outage was found to have run for 17
 * days. The Supabase Auth SMTP credential had expired, so /signup and /recover
 * both returned 500. Nothing in the database recorded it — a failed signup is
 * rolled back, leaving no row — and the application's own email kept flowing,
 * because that uses the Resend API rather than Auth's SMTP. Every existing
 * monitor signal stayed green for 17 days.
 *
 * This measures the ABSENCE OF SUCCESS, which is a weak signal: it cannot tell
 * a real outage from a quiet week, and it needs `thresholdDays` to pass before
 * it says anything. It is a floor on how long a total outage can hide, not a
 * detector. An active probe of the auth email path is the real answer.
 *
 * @param recentSignupCount signups within the threshold window
 * @param lastSignupAt      ISO timestamp of the newest signup, or null if none
 * @param now               current time, injected so tests are deterministic
 */
export function assessSignupBlackout(
  recentSignupCount: number,
  lastSignupAt: string | null,
  now: Date,
  thresholdDays = 7,
): SignupBlackoutVerdict {
  if (recentSignupCount > 0) {
    return { alert: false, daysQuiet: daysBetween(lastSignupAt, now), neverAnySignup: false };
  }

  if (lastSignupAt === null) {
    // A brand-new project with no users is not an incident. Saying "no signups
    // ever" to an empty project would be noise on day one, and the alert would
    // never clear until the first user arrived.
    return { alert: false, daysQuiet: null, neverAnySignup: true };
  }

  const daysQuiet = daysBetween(lastSignupAt, now);

  // An unparseable or future timestamp means something is wrong with the data,
  // not with signup. Stay quiet rather than raise an alert nobody can act on.
  if (daysQuiet === null || daysQuiet < 0) {
    return { alert: false, daysQuiet, neverAnySignup: false };
  }

  return { alert: true, daysQuiet, neverAnySignup: false };
}

function daysBetween(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.floor((now.getTime() - then) / 86_400_000);
}
