import { describe, expect, it } from "vitest";
import {
  FOOTER_STRINGS, NOTIFICATION_CATEGORIES, prefsHeaders, prefsOneClickUrl, prefsPageUrl, renderPrefsFooter, toLang,
} from "../../supabase/functions/_shared/notification-footer";

const TOKEN = "a".repeat(64);

describe("FOOTER_STRINGS", () => {
  it("covers all 10 UI languages with every key filled", () => {
    expect(Object.keys(FOOTER_STRINGS).sort()).toEqual(["ar", "de", "en", "es", "fr", "ht", "ja", "pt", "ru", "zh"]);
    const keys = Object.keys(FOOTER_STRINGS.en).sort();
    for (const [lang, s] of Object.entries(FOOTER_STRINGS)) {
      expect(Object.keys(s).sort(), lang).toEqual(keys);
      for (const v of Object.values(s)) expect(v.trim(), lang).not.toBe("");
      expect(s.parent, lang).toContain("{student}");
      expect(s.coGuardian, lang).toContain("{student}");
    }
  });
});

describe("toLang", () => {
  it("normalizes codes and falls back to EN", () => {
    expect(toLang("HT")).toBe("ht");
    expect(toLang("fr-CA")).toBe("fr");
    expect(toLang("pt_BR")).toBe("pt");
    expect(toLang("xx")).toBe("en");
    expect(toLang(null)).toBe("en");
  });
});

describe("URLs and headers", () => {
  it("page link goes to www /notifications with token, language and optional category", () => {
    expect(prefsPageUrl(TOKEN, "HT", "daily_report")).toBe(
      `https://www.independentmindsedu.org/notifications?token=${TOKEN}&lang=ht&category=daily_report`,
    );
    expect(prefsPageUrl(TOKEN, "en")).toBe(`https://www.independentmindsedu.org/notifications?token=${TOKEN}&lang=en`);
  });

  it("List-Unsubscribe points at the one-click function for THIS category, with RFC 8058 Post", () => {
    expect(prefsHeaders(TOKEN, "morning_reminder")).toEqual({
      "List-Unsubscribe": `<${prefsOneClickUrl(TOKEN, "morning_reminder")}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(prefsOneClickUrl(TOKEN, "weekly_badge")).toMatch(
      /^https:\/\/[a-z]+\.supabase\.co\/functions\/v1\/notification-preferences\?token=a{64}&category=weekly_badge$/,
    );
  });

  it("lists exactly the four notification categories", () => {
    expect([...NOTIFICATION_CATEGORIES]).toEqual(["morning_reminder", "checkin_reminder", "daily_report", "weekly_badge"]);
  });
});

describe("renderPrefsFooter", () => {
  const base = { language: "en", kind: "parent", studentName: "Kid", category: "daily_report" as const, token: TOKEN };

  it("explains why (parent vs co-guardian) and links to this category and to all emails", () => {
    const parent = renderPrefsFooter(base);
    expect(parent).toContain("as the parent of Kid");
    expect(parent).toContain(`href="https://www.independentmindsedu.org/notifications?token=${TOKEN}&amp;lang=en&amp;category=daily_report"`);
    expect(parent).toContain(`href="https://www.independentmindsedu.org/notifications?token=${TOKEN}&amp;lang=en"`);
    expect(renderPrefsFooter({ ...base, kind: "co_guardian" })).toContain("as a co-guardian for Kid");
  });

  it("uses the recipient's language, RTL for Arabic", () => {
    expect(renderPrefsFooter({ ...base, language: "ht" })).toContain("Jere tout imèl yo");
    expect(renderPrefsFooter({ ...base, language: "ar" })).toContain('dir="rtl"');
    expect(renderPrefsFooter({ ...base, language: "fr" })).not.toContain('dir="rtl"');
  });

  it("escapes the student name", () => {
    const html = renderPrefsFooter({ ...base, studentName: `<script>x</script>"` });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("without a token (parent-only fallback) has no preferences link, only the account link", () => {
    const html = renderPrefsFooter({ ...base, token: null });
    expect(html).not.toContain("/notifications");
    expect(html).toContain('href="https://www.independentmindsedu.org/login"');
  });
});
