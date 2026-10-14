import { describe, it, expect } from "vitest";
import {
  TRANSLATION_LANGUAGES, campaignFromTopic, checkScheduledFor, isSaturday, isValidCampaign, nearestSaturday, slugify,
} from "../../../supabase/functions/_shared/article-generation";

describe("slug / campaign", () => {
  it("turns a topic into a valid campaign", () => {
    const c = campaignFromTopic("Building a Daily Routine at Home", "2026-10-24");
    expect(c).toBe("building-a-daily-routine-at-home-2026-10");
    expect(isValidCampaign(c)).toBe(true);
  });

  it("drops accents and special characters", () => {
    expect(slugify("Lekòl lakay: ki jan pou ou kòmanse? (2026) — 100% pratik!")).toBe("lekol-lakay-ki-jan-pou-ou-komanse-2026-100-pratik");
    expect(slugify("Éducation & ÉCOLE à la maison")).toBe("education-ecole-a-la-maison");
  });

  it("stays at most 60 characters with the -YYYY-MM suffix", () => {
    const c = campaignFromTopic("word ".repeat(40), "2026-10-24");
    expect(c.length).toBeLessThanOrEqual(60);
    expect(isValidCampaign(c)).toBe(true);
    expect(c).not.toMatch(/--/);
  });

  it("falls back when the topic has no latin letters", () => {
    expect(campaignFromTopic("家庭教育", "2026-11-07")).toBe("article-2026-11");
  });

  it("validates campaigns", () => {
    expect(isValidCampaign("abc")).toBe(true);
    expect(isValidCampaign("ab")).toBe(false);
    expect(isValidCampaign("Abc")).toBe(false);
    expect(isValidCampaign("a b c")).toBe(false);
    expect(isValidCampaign("a".repeat(61))).toBe(false);
  });
});

describe("Saturday rule", () => {
  const today = "2026-10-14"; // a Wednesday

  it("accepts a future Saturday", () => {
    expect(isSaturday("2026-10-24")).toBe(true);
    expect(checkScheduledFor("2026-10-24", today)).toEqual({ ok: true });
  });

  it("refuses a Tuesday and proposes the nearest Saturday", () => {
    // Tue 2026-10-27: Sat 24 is 3 days before, Sat 31 is 4 after.
    expect(checkScheduledFor("2026-10-27", today)).toEqual({ ok: false, reason: "not_saturday", suggestion: "2026-10-24" });
    // Thu 2026-10-29: Sat 31 is 2 days after.
    expect(nearestSaturday("2026-10-29", today)).toBe("2026-10-31");
  });

  it("never proposes a Saturday that is not in the future", () => {
    // Seen on Sunday 2026-10-18, Tue 2026-10-20: Sat 17 is closer but already past → Sat 24.
    expect(checkScheduledFor("2026-10-20", "2026-10-18")).toEqual({ ok: false, reason: "not_saturday", suggestion: "2026-10-24" });
  });

  it("refuses today and past dates, suggesting the next Saturday", () => {
    expect(checkScheduledFor("2026-10-14", today)).toEqual({ ok: false, reason: "past", suggestion: "2026-10-17" });
    expect(checkScheduledFor("2026-10-17", "2026-10-17")).toEqual({ ok: false, reason: "past", suggestion: "2026-10-24" });
  });

  it("refuses invalid dates", () => {
    for (const d of ["2026-02-30", "24/10/2026", "", null, 20261024]) {
      expect(checkScheduledFor(d, today)).toMatchObject({ ok: false, reason: "invalid" });
    }
  });

  it("translation languages are the 9 non-English ones", () => {
    expect(TRANSLATION_LANGUAGES).toEqual(["HT", "FR", "ES", "PT", "AR", "ZH", "DE", "JA", "RU"]);
  });
});
