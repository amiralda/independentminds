import { describe, it, expect } from "vitest";
import {
  TRANSLATION_LANGUAGES, campaignFromTopic, checkScheduledFor, englishWordShare, isSaturday, isValidCampaign, looksEnglish, nearestSaturday, slugify,
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

describe("looksEnglish (guard on the EN draft)", () => {
  const en = "## Why routines break\n\nWhen a week fills up with appointments and errands, the school day is often the first thing to slip. Families who homeschool know that a plan made on Sunday rarely survives Wednesday, and that the cost is not only lost lessons but also the time spent deciding, every morning, what to do next. **A written plan** for each student removes that daily negotiation.";
  const others: Record<string, string> = {
    HT: "## Planifye chak jou ak Klarite\n\nLè yon semèn vin chaje ak anpil aktivite, **planifikasyon** vin pi enpòtan toujou pou fanmi ki ap fè lekòl lakay. Sou platfòm Independent Minds EDU (IME), yon paran ka bati orè chak jou pou chak elèv nan fanmi an.",
    FR: "## Pourquoi les routines se brisent\n\nQuand une semaine se remplit de rendez-vous, la journée d'école est souvent la première chose qui glisse. Les fonctionnalités de la plateforme aident les familles à planifier chaque jour pour chaque élève.",
    ES: "## Por qué se rompen las rutinas\n\nCuando una semana se llena de citas y recados, la jornada escolar suele ser lo primero que se pierde. Las familias que educan en casa saben que un plan hecho el domingo rara vez sobrevive al miércoles.",
    PT: "## Por que as rotinas se quebram\n\nQuando uma semana se enche de compromissos, o dia de estudo costuma ser a primeira coisa a escapar. As famílias que educam em casa sabem que um plano feito no domingo raramente sobrevive à quarta-feira.",
    DE: "## Warum Routinen zerbrechen\n\nWenn sich eine Woche mit Terminen füllt, ist der Schultag oft das Erste, was verrutscht. Familien, die zu Hause unterrichten, wissen, dass ein Plan vom Sonntag selten den Mittwoch übersteht.",
    JA: "## ルーティンが崩れる理由\n\n予定が詰まった週には、まず学習の時間が後回しになりがちです。",
  };

  it("accepts real English prose", () => {
    expect(looksEnglish(en)).toBe(true);
    expect(englishWordShare(en)).toBeGreaterThan(0.12);
  });

  it("refuses the other languages, including the Kreyòl 'EN' row of test-jenerasyon-1", () => {
    for (const [lang, text] of Object.entries(others)) {
      expect({ lang, english: looksEnglish(text) }).toEqual({ lang, english: false });
    }
  });

  it("refuses empty text", () => {
    expect(looksEnglish("")).toBe(false);
  });
});
