// Haiti calendar helpers for the notification crons (daily report, check-in
// reminder, weekly badge). Pure TypeScript, no imports: used by the Deno
// functions and by the unit tests (via Vite).
//
// Intl only. Never `new Date(d.toLocaleString("en-US", { timeZone }))`: that
// re-parses Haiti wall time in the RUNTIME's zone (UTC on Supabase), so
// setHours(0, 0, 0, 0) lands on midnight UTC = 20:00 (EDT) / 19:00 (EST) in
// Haiti the day before, and every "today" window starts 4-5 hours too early.
// Haiti observes DST (UTC-4 from the 2nd Sunday of March to the 1st Sunday of
// November, UTC-5 otherwise); the crons themselves are fixed in UTC.

export const HAITI_TZ = "America/Port-au-Prince";

/** Today's date on the Haiti calendar, YYYY-MM-DD. */
export function haitiDate(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: HAITI_TZ });
}

/** Haiti's UTC offset at an instant, as "-04:00" / "-05:00" (from "GMT-04:00"). */
export function haitiOffset(at: Date): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: HAITI_TZ, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const off = name.replace("GMT", "");
  return off === "" ? "+00:00" : off;
}

/** YYYY-MM-DD shifted by n calendar days. */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The instant of 00:00 Haiti time on a Haiti date. The DST switch happens at
 * 02:00 local, so the offset in force at local midnight is the one at 04:00
 * UTC that day (still before either switch: 06:00 UTC in November, 07:00 UTC
 * in March). */
export function haitiMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00${haitiOffset(new Date(`${ymd}T04:00:00Z`))}`);
}

/** Today in Haiti as [dayStart, dayEnd): from 00:00 to the next 00:00 Haiti
 * time (23 or 25 hours on DST switch days), as ISO strings for timestamptz
 * filters. */
export function haitiDayBounds(now = new Date()): { today: string; dayStart: string; dayEnd: string } {
  const today = haitiDate(now);
  return {
    today,
    dayStart: haitiMidnight(today).toISOString(),
    dayEnd: haitiMidnight(addDays(today, 1)).toISOString(),
  };
}

/** The Monday-to-Sunday week (Haiti calendar) containing `now`: date strings
 * for date columns, and [weekStart, weekEnd) instants for timestamptz ones. */
export function haitiWeekBounds(now = new Date()): { mondayStr: string; sundayStr: string; weekStart: Date; weekEnd: Date } {
  const today = haitiDate(now);
  const [y, m, d] = today.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const mondayStr = addDays(today, -((dayOfWeek + 6) % 7));
  return {
    mondayStr,
    sundayStr: addDays(mondayStr, 6),
    weekStart: haitiMidnight(mondayStr),
    weekEnd: haitiMidnight(addDays(mondayStr, 7)),
  };
}
