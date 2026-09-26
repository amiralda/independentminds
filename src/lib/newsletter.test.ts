import { describe, expect, it } from "vitest";
import { articleLanguages, groupByCampaign, pickVersion, type NewsletterDraft } from "./newsletter";

const row = (campaign: string, language: string, extra: Partial<NewsletterDraft> = {}): NewsletterDraft => ({
  id: `${campaign}-${language}`,
  campaign,
  language,
  title: `${language} title`,
  content: "",
  status: "pending_approval",
  created_at: "2026-09-26T10:00:00Z",
  scheduled_for: null,
  approved_at: null,
  ...extra,
});

describe("newsletter", () => {
  it("groups the language rows of a campaign into one article, newest first", () => {
    const list = groupByCampaign([
      row("old", "EN", { created_at: "2026-01-01T00:00:00Z" }),
      row("welcome", "EN"),
      row("welcome", "HT"),
      row("welcome", "ES"),
    ]);
    expect(list.map(a => a.campaign)).toEqual(["welcome", "old"]);
    expect(list[0].versions).toHaveLength(3);
    expect(articleLanguages(list[0])).toEqual(["EN", "HT", "ES"]);
  });

  it("reports one status and date when every version agrees, 'mixed' otherwise", () => {
    const same = groupByCampaign([
      row("a", "EN", { status: "approved", scheduled_for: "2026-10-03" }),
      row("a", "HT", { status: "approved", scheduled_for: "2026-10-03" }),
    ])[0];
    expect(same.status).toBe("approved");
    expect(same.scheduledFor).toBe("2026-10-03");
    const mixed = groupByCampaign([row("b", "EN", { status: "approved" }), row("b", "HT")])[0];
    expect(mixed.status).toBe("mixed");
  });

  it("shows the wanted language, falling back to English", () => {
    const a = groupByCampaign([row("c", "EN"), row("c", "HT"), row("c", "ES")])[0];
    expect(pickVersion(a, "HT").language).toBe("HT");
    expect(pickVersion(a, "ES").language).toBe("ES");
    expect(pickVersion(a, "JA").language).toBe("EN");
    const noEn = groupByCampaign([row("d", "FR")])[0];
    expect(pickVersion(noEn, "JA").language).toBe("FR");
  });
});
