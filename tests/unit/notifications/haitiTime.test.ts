// Haiti calendar windows for the notification crons. The old code built
// "today" with new Date(now.toLocaleString(..., Haiti)) + setHours(0), which on
// a UTC runtime is midnight UTC = 20:00 (EDT) / 19:00 (EST) Haiti the day
// before. These tests pin the Intl-based replacement, in summer (UTC-4) and in
// winter (UTC-5), including the two DST switch days.
import { describe, it, expect } from "vitest";
import {
  addDays, haitiDate, haitiDayBounds, haitiMidnight, haitiOffset, haitiWeekBounds,
} from "../../../supabase/functions/_shared/haiti-time";

const inWindow = (iso: string, w: { dayStart: string; dayEnd: string }) => iso >= w.dayStart && iso < w.dayEnd;

describe("haitiOffset", () => {
  it("is -04:00 in summer and -05:00 in winter", () => {
    expect(haitiOffset(new Date("2026-07-15T12:00:00Z"))).toBe("-04:00");
    expect(haitiOffset(new Date("2026-01-15T12:00:00Z"))).toBe("-05:00");
  });
});

describe("haitiDayBounds — summer (UTC-4)", () => {
  // daily-report cron: 01:00 UTC on Jul 16 = 21:00 on Jul 15 in Haiti.
  const w = haitiDayBounds(new Date("2026-07-16T01:00:00Z"));

  it("is the Haiti day, midnight to midnight Haiti time", () => {
    expect(w).toEqual({ today: "2026-07-15", dayStart: "2026-07-15T04:00:00.000Z", dayEnd: "2026-07-16T04:00:00.000Z" });
  });

  it("counts a check-in made at 20:30 Haiti (00:30 UTC next day) — the old window dropped it", () => {
    expect(inWindow("2026-07-16T00:30:00.000Z", w)).toBe(true);
  });

  it("does not count a check-in made at 22:00 Haiti the day before — the old window included it", () => {
    expect(inWindow("2026-07-15T02:00:00.000Z", w)).toBe(false);
  });

  it("check-in reminder cron (14:00 UTC = 10:00 Haiti) gets the same day", () => {
    expect(haitiDayBounds(new Date("2026-07-15T14:00:00Z"))).toEqual(w);
  });
});

describe("haitiDayBounds — winter (UTC-5)", () => {
  // daily-report cron: 01:00 UTC on Jan 16 = 20:00 on Jan 15 in Haiti.
  const w = haitiDayBounds(new Date("2026-01-16T01:00:00Z"));

  it("is the Haiti day, midnight to midnight Haiti time", () => {
    expect(w).toEqual({ today: "2026-01-15", dayStart: "2026-01-15T05:00:00.000Z", dayEnd: "2026-01-16T05:00:00.000Z" });
  });

  it("counts a check-in at 19:30 Haiti, not one at 23:00 Haiti the day before", () => {
    expect(inWindow("2026-01-16T00:30:00.000Z", w)).toBe(true);
    expect(inWindow("2026-01-15T04:00:00.000Z", w)).toBe(false);
  });
});

describe("DST switch days", () => {
  it("2026-03-08 (spring forward) is 23 hours: 05:00Z to 04:00Z next day", () => {
    const w = haitiDayBounds(new Date("2026-03-08T16:00:00Z"));
    expect(w).toEqual({ today: "2026-03-08", dayStart: "2026-03-08T05:00:00.000Z", dayEnd: "2026-03-09T04:00:00.000Z" });
  });

  it("2026-11-01 (fall back) is 25 hours: 04:00Z to 05:00Z next day", () => {
    const w = haitiDayBounds(new Date("2026-11-01T16:00:00Z"));
    expect(w).toEqual({ today: "2026-11-01", dayStart: "2026-11-01T04:00:00.000Z", dayEnd: "2026-11-02T05:00:00.000Z" });
  });

  it("haitiMidnight uses the offset in force at local midnight", () => {
    expect(haitiMidnight("2026-03-08").toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(haitiMidnight("2026-03-09").toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(haitiMidnight("2026-11-01").toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(haitiMidnight("2026-11-02").toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
});

describe("haitiWeekBounds (weekly badge, Monday 02:00 UTC = Sunday night in Haiti)", () => {
  it("summer: the Haiti week Mon Oct 5 .. Sun Oct 11, Haiti midnights", () => {
    expect(haitiWeekBounds(new Date("2026-10-12T02:00:00Z"))).toEqual({
      mondayStr: "2026-10-05", sundayStr: "2026-10-11",
      weekStart: new Date("2026-10-05T04:00:00.000Z"), weekEnd: new Date("2026-10-12T04:00:00.000Z"),
    });
  });

  it("winter: the Haiti week Mon Jan 5 .. Sun Jan 11, Haiti midnights", () => {
    expect(haitiWeekBounds(new Date("2026-01-12T02:00:00Z"))).toEqual({
      mondayStr: "2026-01-05", sundayStr: "2026-01-11",
      weekStart: new Date("2026-01-05T05:00:00.000Z"), weekEnd: new Date("2026-01-12T05:00:00.000Z"),
    });
  });

  it("the week containing the fall-back switch ends at a winter midnight", () => {
    const w = haitiWeekBounds(new Date("2026-11-02T02:00:00Z")); // Sun Nov 1, 21:00 EST
    expect(w.mondayStr).toBe("2026-10-26");
    expect(w.weekStart.toISOString()).toBe("2026-10-26T04:00:00.000Z");
    expect(w.weekEnd.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
});

describe("helpers", () => {
  it("haitiDate and addDays", () => {
    expect(haitiDate(new Date("2026-10-10T03:59:00Z"))).toBe("2026-10-09"); // 23:59 EDT
    expect(haitiDate(new Date("2026-10-10T04:00:00Z"))).toBe("2026-10-10");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
