// Pure logic behind the public /notifications page (no React, unit-tested).
// Mirrors public.is_notification_enabled(): no row = on; 'all' is a master
// switch; paused_until is the FIRST DAY mail resumes, on the Haiti calendar.

export const PREF_CATEGORIES = ["morning_reminder", "checkin_reminder", "daily_report", "weekly_badge"] as const;
export type PrefCategory = (typeof PREF_CATEGORIES)[number];
export type PrefKey = PrefCategory | "all";
export type PrefState = "on" | "paused" | "off";

export interface PrefRow {
  category: PrefKey;
  state: PrefState;
  paused_until: string | null;
}

export const PREF_TOKEN_RE = /^[0-9a-f]{64}$/;

export const isPrefCategory = (v: string | null | undefined): v is PrefCategory =>
  !!v && (PREF_CATEGORIES as readonly string[]).includes(v);

/** Today on the Haiti calendar, YYYY-MM-DD (the crons and pauses use it). */
export const haitiToday = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "America/Port-au-Prince" });

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** What a row means today: a pause whose resume day has arrived is simply on. */
export function effectiveState(rows: PrefRow[], key: PrefKey, today: string): { state: PrefState; resumes: string | null } {
  const row = rows.find((r) => r.category === key);
  if (!row || row.state === "on") return { state: "on", resumes: null };
  if (row.state === "paused") {
    return row.paused_until && row.paused_until > today ? { state: "paused", resumes: row.paused_until } : { state: "on", resumes: null };
  }
  return { state: "off", resumes: null };
}

/** Pause choices offered on the page; the value is the resume date sent to the endpoint. */
export const PAUSE_OPTIONS = [
  { key: "notifPrefs.pause1w", days: 7 },
  { key: "notifPrefs.pause2w", days: 14 },
  { key: "notifPrefs.pause1m", days: 30 },
] as const;

/** Readable resume date in the UI language (Intl has no Haitian Creole: French). */
export function formatResumeDate(ymd: string, uiLang: string): string {
  const locale = uiLang.toUpperCase() === "HT" ? "fr" : uiLang.toLowerCase();
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  try {
    return date.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  } catch {
    return ymd;
  }
}
