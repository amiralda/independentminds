import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Lang } from "@/lib/i18n";
import { fromDbLang } from "@/lib/languagePref";
import {
  NEWSLETTER_COLUMNS, articleLanguages, formatNewsletterDate as fmtDate, groupByCampaign, pickVersion,
  type NewsletterArticle, type NewsletterDraft,
} from "@/lib/newsletter";
import { NewsletterLangSelect, NewsletterStatusBadge } from "@/components/admin/NewsletterBits";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

export default function AdminNewsletter() {
  const { t } = useI18n();
  const { profile } = useAuth();
  // Default reading language = the admin's own profile language (EN fallback).
  const adminLang: Lang = fromDbLang(profile?.languagePref) ?? "EN";
  const [articles, setArticles] = useState<NewsletterArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Record<string, Lang>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("email_newsletter_drafts" as never)
        .select(NEWSLETTER_COLUMNS)
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      else setArticles(groupByCampaign((data ?? []) as unknown as NewsletterDraft[]));
    })();
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">{t("adminNews.nav")}</h1>
        <p className="text-sm text-white/50 mt-1">{t("adminNews.subtitle")}</p>
      </div>

      {error && <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-red-300 text-sm">{error}</div>}

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">{t("adminNews.colArticle")}</TableHead>
              <TableHead className="text-white/60">{t("adminNews.colStatus")}</TableHead>
              <TableHead className="text-white/60">{t("adminNews.colScheduled")}</TableHead>
              <TableHead className="text-white/60">{t("adminNews.colCreated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(articles ?? []).map((a) => {
              const langs = articleLanguages(a);
              const version = pickVersion(a, chosen[a.campaign] ?? adminLang);
              const shown = fromDbLang(version.language) ?? "EN";
              return (
                <TableRow key={a.campaign} data-campaign={a.campaign} className="border-white/10 hover:bg-white/5">
                  <TableCell className="min-w-[16rem]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Link
                        to={`/admin/newsletter/${encodeURIComponent(a.campaign)}?lang=${shown}`}
                        data-testid="newsletter-title"
                        dir={shown === "AR" ? "rtl" : "ltr"}
                        className="text-white font-medium hover:underline"
                      >
                        {version.title}
                      </Link>
                      <NewsletterLangSelect
                        value={shown}
                        options={langs}
                        onChange={(l) => setChosen((c) => ({ ...c, [a.campaign]: l }))}
                      />
                    </div>
                    <div className="text-[11px] text-white/40 font-mono mt-1">
                      {a.campaign} · {t("adminNews.versions").replace("{n}", String(langs.length))}
                    </div>
                  </TableCell>
                  <TableCell><NewsletterStatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-white/70 text-xs">{fmtDate(a.scheduledFor) ?? <span className="text-white/40">{t("adminNews.notScheduled")}</span>}</TableCell>
                  <TableCell className="text-white/50 text-xs">{fmtDate(a.createdAt)}</TableCell>
                </TableRow>
              );
            })}
            {articles?.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={4} className="text-center text-white/40 py-8">{t("adminNews.empty")}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
