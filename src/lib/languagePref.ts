import type { Lang } from "@/lib/i18n";

// The UI uses uppercase codes ("HT"); profiles.language_pref stores the
// lowercase ISO 639-1 code ("ht"), enforced by a CHECK + trigger in the DB.
const DB_LANGS = ["en", "ht", "fr", "es", "pt", "ar", "zh", "de", "ja", "ru"] as const;

export const toDbLang = (l: Lang): string => l.toLowerCase();

/** "HT" / "ht" / "pt-BR" -> "HT" / "HT" / "PT"; anything else -> null. */
export function fromDbLang(v: string | null | undefined): Lang | null {
  const code = (v ?? "").trim().replace("_", "-").split("-")[0].toLowerCase();
  return (DB_LANGS as readonly string[]).includes(code) ? (code.toUpperCase() as Lang) : null;
}

/**
 * What to do with the UI language once the profile of a freshly signed-in user
 * is loaded:
 * - "apply": the profile's language wins (restores it on a new device/login).
 * - "keep": keep the UI language; the caller saves it to the profile if it
 *   differs. Used for a brand-new account still on the 'en' column default,
 *   so a visitor who picked Kreyòl before signing up is not switched to EN.
 */
export function initialLanguageAction(
  profileLang: string | null | undefined,
  onboardingComplete: boolean,
  uiLang: Lang,
): { type: "apply"; lang: Lang } | { type: "keep" } {
  const db = fromDbLang(profileLang);
  if (!db) return { type: "keep" };
  if (db === "EN" && !onboardingComplete) return { type: "keep" };
  return db === uiLang ? { type: "keep" } : { type: "apply", lang: db };
}
