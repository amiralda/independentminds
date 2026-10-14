// Pure helpers for newsletter article generation, shared by the
// generate-article edge function (Deno) and the /admin/newsletter dialog
// (Vite), so both validate the campaign and the publication date the same
// way. No imports.

/** Every language of email_newsletter_drafts (its CHECK constraint). */
export const ARTICLE_LANGUAGES = ["EN", "HT", "FR", "ES", "PT", "AR", "ZH", "DE", "JA", "RU"] as const;
export type ArticleLanguage = (typeof ARTICLE_LANGUAGES)[number];

/** The 9 languages translated from the English version, in order. */
export const TRANSLATION_LANGUAGES = ARTICLE_LANGUAGES.filter((l) => l !== "EN") as Exclude<ArticleLanguage, "EN">[];

export const CAMPAIGN_RE = /^[a-z0-9-]{3,60}$/;

export function isValidCampaign(c: unknown): c is string {
  return typeof c === "string" && CAMPAIGN_RE.test(c);
}

/** "Homeschool & Routines!" -> "homeschool-routines" (accents dropped, max 52 chars). */
export function slugify(text: string, max = 52): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, max).replace(/-+$/g, "");
}

/** Topic + publication month -> campaign, e.g. "homeschool-routines-2026-10". */
export function campaignFromTopic(topic: string, ymd: string): string {
  const base = slugify(topic) || "article";
  return `${base}-${ymd.slice(0, 7)}`;
}

/** A real calendar date "YYYY-MM-DD" -> its UTC day number, else null. */
function dayNumber(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  if (new Date(t).toISOString().slice(0, 10) !== ymd) return null;
  return t / 86_400_000;
}

const fromDayNumber = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

export function isSaturday(ymd: string): boolean {
  const n = dayNumber(ymd);
  return n !== null && new Date(n * 86_400_000).getUTCDay() === 6;
}

/**
 * The Saturday closest to `ymd` that is still after `today` (both
 * "YYYY-MM-DD"). Distances to the previous and next Saturday always add up
 * to 7, so there is never a tie.
 */
export function nearestSaturday(ymd: string, today: string): string | null {
  const n = dayNumber(ymd);
  const t = dayNumber(today);
  if (n === null || t === null) return null;
  const saturdayOnOrBefore = (x: number) => x - ((new Date(x * 86_400_000).getUTCDay() + 1) % 7);
  const prev = saturdayOnOrBefore(n);
  const next = prev === n ? n : prev + 7;
  const candidates = [prev, next].filter((s) => s > t).sort((a, b) => Math.abs(a - n) - Math.abs(b - n));
  // Date in the past (or today): the first Saturday after today.
  return fromDayNumber(candidates[0] ?? saturdayOnOrBefore(t) + 7);
}

export type ScheduleCheck =
  | { ok: true }
  | { ok: false; reason: "invalid" | "past" | "not_saturday"; suggestion: string | null };

/** The publication date must be a real date, after today, and a Saturday (the send cron runs on Saturdays). */
export function checkScheduledFor(ymd: unknown, today: string): ScheduleCheck {
  if (typeof ymd !== "string" || dayNumber(ymd) === null) return { ok: false, reason: "invalid", suggestion: null };
  if (ymd <= today) return { ok: false, reason: "past", suggestion: nearestSaturday(today, today) };
  if (!isSaturday(ymd)) return { ok: false, reason: "not_saturday", suggestion: nearestSaturday(ymd, today) };
  return { ok: true };
}

// English function words: frequent in any English prose, (almost) absent from
// the other 9 languages. "a" and "in" are left out (also Kreyòl, Spanish,
// Portuguese, German words).
const ENGLISH_MARKERS = new Set(["the", "and", "that", "with", "for", "of", "to", "is", "are", "this", "your", "their", "it"]);

/** Share of English function words among the words of `text` (Markdown ignored). */
export function englishWordShare(text: string): number {
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  if (words.length === 0) return 0;
  return words.filter((w) => ENGLISH_MARKERS.has(w)).length / words.length;
}

/**
 * True when the text reads as English. Real English articles score about
 * 0.15-0.25; Kreyòl, French, Spanish... about 0-0.02.
 */
export function looksEnglish(text: string, minShare = 0.08): boolean {
  return englishWordShare(text) >= minShare;
}
