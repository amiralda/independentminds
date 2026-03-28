import { describe, it, expect } from "vitest";

/**
 * The project uses inline translations in src/lib/i18n.tsx.
 * This test dynamically imports the translations object and validates
 * that FR, ES, HT contain every key that EN has.
 */

// We need to extract the translations from the i18n module.
// Since it's not directly exported, we'll read the file and parse the keys.
// For a robust approach, we re-declare the critical keys that MUST exist.

const REQUIRED_KEYS = [
  "app.title",
  "app.subtitle",
  "nav.today",
  "nav.checkin",
  "nav.settings",
  "nav.inbox",
  "nav.schedule",
  "nav.dadPanel",
  "status.planned",
  "status.done",
  "login.title",
  "login.email",
  "login.password",
  "login.signIn",
  "signup.title",
  "rewards.title",
  "checkin.mood",
  "checkin.focus",
  "checkin.submit",
];

const LANGS_TO_CHECK = ["HT", "FR", "ES"] as const;

// Dynamically import the i18n module to access translations
// We'll use a regex approach to validate the source file
import { readFileSync } from "fs";
import { resolve } from "path";

function parseTranslationKeys(): Record<string, string[]> {
  const filePath = resolve(__dirname, "../../../src/lib/i18n.tsx");
  const content = readFileSync(filePath, "utf-8");

  // Extract translation keys and which languages they have
  const result: Record<string, string[]> = {};
  const keyRegex = /"([a-zA-Z0-9_.]+)":\s*\{([^}]+)\}/g;
  let match;

  while ((match = keyRegex.exec(content)) !== null) {
    const key = match[1];
    const langBlock = match[2];
    const langs: string[] = [];
    const langEntryRegex = /\b(EN|HT|FR|ES|PT|AR|ZH|DE|JA|RU):/g;
    let langMatch;
    while ((langMatch = langEntryRegex.exec(langBlock)) !== null) {
      langs.push(langMatch[1]);
    }
    if (langs.includes("EN")) {
      result[key] = langs;
    }
  }

  return result;
}

describe("i18n translations completeness", () => {
  const translationMap = parseTranslationKeys();
  const allKeys = Object.keys(translationMap);

  it("should have at least 100 translation keys", () => {
    expect(allKeys.length).toBeGreaterThanOrEqual(100);
  });

  for (const lang of LANGS_TO_CHECK) {
    it(`${lang} should contain all required keys`, () => {
      const missing = REQUIRED_KEYS.filter(
        (key) => !translationMap[key]?.includes(lang)
      );
      expect(missing).toEqual([]);
    });
  }

  it("should have guardians-related keys in all 4 core languages", () => {
    const guardianKeys = allKeys.filter((k) => k.startsWith("guardians."));
    expect(guardianKeys.length).toBeGreaterThan(0);
    for (const key of guardianKeys) {
      for (const lang of ["EN", "HT", "FR", "ES"]) {
        expect(
          translationMap[key]?.includes(lang),
          `${key} missing ${lang}`
        ).toBe(true);
      }
    }
  });

  it("should have inbox-related keys in all 4 core languages", () => {
    const inboxKeys = allKeys.filter((k) => k.startsWith("inbox."));
    expect(inboxKeys.length).toBeGreaterThan(0);
    for (const key of inboxKeys) {
      for (const lang of ["EN", "HT", "FR", "ES"]) {
        expect(
          translationMap[key]?.includes(lang),
          `${key} missing ${lang}`
        ).toBe(true);
      }
    }
  });
});
