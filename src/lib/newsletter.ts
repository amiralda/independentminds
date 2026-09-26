import type { Lang } from "@/lib/i18n";
import { fromDbLang } from "@/lib/languagePref";

export type NewsletterStatus = "pending_approval" | "approved" | "sent" | "archived";

/** One language version of an article (a row of email_newsletter_drafts). */
export interface NewsletterDraft {
  id: string;
  campaign: string;
  language: string; // uppercase in this table ("EN", "HT", …)
  title: string;
  content: string;
  status: NewsletterStatus;
  created_at: string;
  scheduled_for: string | null;
  approved_at: string | null;
}

/** One article = one campaign with its language versions. */
export interface NewsletterArticle {
  campaign: string;
  versions: NewsletterDraft[];
  status: NewsletterStatus | "mixed";
  createdAt: string;
  scheduledFor: string | null;
  approvedAt: string | null;
}

export const NEWSLETTER_COLUMNS =
  "id, campaign, language, title, content, status, created_at, scheduled_for, approved_at";

/** Groups rows by campaign, newest article first. */
export function groupByCampaign(rows: NewsletterDraft[]): NewsletterArticle[] {
  const map = new Map<string, NewsletterDraft[]>();
  for (const r of rows) map.set(r.campaign, [...(map.get(r.campaign) ?? []), r]);
  return [...map.entries()]
    .map(([campaign, versions]) => {
      const statuses = new Set(versions.map(v => v.status));
      const dates = new Set(versions.map(v => v.scheduled_for ?? ""));
      return {
        campaign,
        versions,
        status: statuses.size === 1 ? versions[0].status : ("mixed" as const),
        createdAt: versions.map(v => v.created_at).sort()[0],
        scheduledFor: dates.size === 1 ? versions[0].scheduled_for : null,
        approvedAt: versions.map(v => v.approved_at).filter(Boolean).sort()[0] ?? null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The languages an article exists in, as UI codes. */
export function articleLanguages(a: NewsletterArticle): Lang[] {
  return a.versions.map(v => fromDbLang(v.language)).filter((l): l is Lang => l !== null);
}

/** The version to show: the wanted language, else English, else the first one. */
export function pickVersion(a: NewsletterArticle, wanted: Lang): NewsletterDraft {
  return (
    a.versions.find(v => fromDbLang(v.language) === wanted) ??
    a.versions.find(v => fromDbLang(v.language) === "EN") ??
    a.versions[0]
  );
}

/** "2026-10-03" (a date column) or an ISO timestamp -> local date string. */
export function formatNewsletterDate(d: string | null): string | null {
  if (!d) return null;
  // Noon avoids a date-only value shifting to the previous day west of UTC.
  return new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString();
}
