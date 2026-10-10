import { describe, expect, it } from "vitest";
import { addDays, effectiveState, formatResumeDate, haitiToday, isPrefCategory, type PrefRow } from "./notificationPrefs";

const TODAY = "2026-10-09";

describe("effectiveState", () => {
  it("no row means on", () => {
    expect(effectiveState([], "daily_report", TODAY)).toEqual({ state: "on", resumes: null });
  });

  it("a pause is active only until its resume day (= first day mail comes back)", () => {
    const rows: PrefRow[] = [{ category: "daily_report", state: "paused", paused_until: "2026-10-12" }];
    expect(effectiveState(rows, "daily_report", TODAY)).toEqual({ state: "paused", resumes: "2026-10-12" });
    expect(effectiveState(rows, "daily_report", "2026-10-11")).toEqual({ state: "paused", resumes: "2026-10-12" });
    expect(effectiveState(rows, "daily_report", "2026-10-12")).toEqual({ state: "on", resumes: null });
  });

  it("off stays off; other categories are untouched", () => {
    const rows: PrefRow[] = [{ category: "morning_reminder", state: "off", paused_until: null }];
    expect(effectiveState(rows, "morning_reminder", TODAY).state).toBe("off");
    expect(effectiveState(rows, "weekly_badge", TODAY).state).toBe("on");
  });
});

describe("dates", () => {
  it("haitiToday uses the Haiti calendar (8 pm Haiti = 01:00 UTC next day)", () => {
    expect(haitiToday(new Date("2026-10-10T01:00:00Z"))).toBe("2026-10-09");
  });

  it("addDays crosses months and years", () => {
    expect(addDays("2026-10-25", 7)).toBe("2026-11-01");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("formats the resume date in the UI language, French for Creole", () => {
    expect(formatResumeDate("2026-10-12", "EN")).toBe("Monday, October 12");
    expect(formatResumeDate("2026-10-12", "HT")).toBe(formatResumeDate("2026-10-12", "FR"));
  });
});

describe("isPrefCategory", () => {
  it("accepts only the four categories", () => {
    expect(isPrefCategory("daily_report")).toBe(true);
    expect(isPrefCategory("all")).toBe(false);
    expect(isPrefCategory("password_reset")).toBe(false);
    expect(isPrefCategory(null)).toBe(false);
  });
});
