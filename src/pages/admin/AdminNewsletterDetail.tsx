import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Lang } from "@/lib/i18n";
import { fromDbLang } from "@/lib/languagePref";
import {
  NEWSLETTER_COLUMNS, articleLanguages, formatNewsletterDate, groupByCampaign, pickVersion,
  type NewsletterArticle, type NewsletterDraft,
} from "@/lib/newsletter";
import { NewsletterLangSelect, NewsletterPreview, NewsletterStatusBadge } from "@/components/admin/NewsletterBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const table = () => supabase.from("email_newsletter_drafts" as never);

export default function AdminNewsletterDetail() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { campaign = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [article, setArticle] = useState<NewsletterArticle | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState<"save" | "date" | "approve" | null>(null);

  const wanted: Lang = fromDbLang(params.get("lang")) ?? fromDbLang(profile?.languagePref) ?? "EN";
  const version = article ? pickVersion(article, wanted) : null;
  const lang: Lang = fromDbLang(version?.language) ?? "EN";
  const locked = article?.status === "sent";
  const dirty = !!version && (title !== version.title || content !== version.content);

  const load = useCallback(async () => {
    const { data, error } = await table().select(NEWSLETTER_COLUMNS).eq("campaign", campaign);
    if (error) { toast.error(`${t("adminNews.error")}: ${error.message}`); return; }
    const rows = (data ?? []) as unknown as NewsletterDraft[];
    const a = rows.length ? groupByCampaign(rows)[0] : null;
    setArticle(a);
    setDate(a?.scheduledFor ?? "");
  }, [campaign, t]);

  useEffect(() => { load(); }, [load]);

  // Load the form when the shown version changes (other language or after a save).
  useEffect(() => {
    if (version) { setTitle(version.title); setContent(version.content); }
  }, [version?.id, version?.title, version?.content]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchLang = (l: Lang) => {
    if (dirty && !window.confirm(t("adminNews.discard"))) return;
    setParams({ lang: l }, { replace: true });
  };

  // Every write re-reads the rows it changed: RLS turns a refused update into
  // "0 rows" instead of an error, so an empty result is reported as a failure.
  const expectRows = (data: unknown[] | null, n: number) => {
    if (!data || data.length !== n) throw new Error(`${data?.length ?? 0}/${n}`);
  };

  const saveText = async () => {
    if (!version) return;
    setBusy("save");
    try {
      const { data, error } = await table().update({ title, content } as never).eq("id", version.id).select("id");
      if (error) throw error;
      expectRows(data, 1);
      toast.success(t("adminNews.saved"));
      await load();
    } catch (e) {
      toast.error(`${t("adminNews.error")}: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(null); }
  };

  const saveDate = async () => {
    if (!article) return;
    setBusy("date");
    try {
      const { data, error } = await table().update({ scheduled_for: date || null } as never).eq("campaign", campaign).select("id");
      if (error) throw error;
      expectRows(data, article.versions.length);
      toast.success(t("adminNews.dateSaved"));
      await load();
    } catch (e) {
      toast.error(`${t("adminNews.error")}: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(null); }
  };

  const approve = async () => {
    if (!article) return;
    setBusy("approve");
    try {
      const pending = article.versions.filter(v => v.status === "pending_approval").length;
      const { data, error } = await table().update({ status: "approved" } as never)
        .eq("campaign", campaign).eq("status", "pending_approval").select("id");
      if (error) throw error;
      expectRows(data, pending);
      toast.success(t("adminNews.approved"));
      await load();
    } catch (e) {
      toast.error(`${t("adminNews.error")}: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(null); }
  };

  if (article === undefined) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
  }

  const back = (
    <Link to="/admin/newsletter" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
      <ArrowLeft size={16} /> {t("adminNews.back")}
    </Link>
  );

  if (!article || !version) {
    return <div className="space-y-4">{back}<p className="text-white/60">{t("adminNews.notFound")}</p></div>;
  }

  const rtl = lang === "AR";
  const n = article.versions.length;

  return (
    <div className="space-y-5">
      {back}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-display font-bold text-white" dir={rtl ? "rtl" : "ltr"} data-testid="detail-title">
          {version.title}
        </h1>
        <NewsletterLangSelect value={lang} options={articleLanguages(article)} onChange={switchLang} />
        <NewsletterStatusBadge status={article.status} />
      </div>
      <div className="text-xs text-white/40 font-mono">
        {article.campaign} · {t("adminNews.versions").replace("{n}", String(n))}
        {article.approvedAt && <> · {t("adminNews.approvedOn").replace("{date}", formatNewsletterDate(article.approvedAt) ?? "")}</>}
      </div>

      {locked && (
        <div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-blue-200 text-sm">{t("adminNews.sentLocked")}</div>
      )}

      {/* Publication date + approval: whole article (all languages) */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label htmlFor="scheduled-for" className="text-xs text-white/60">{t("adminNews.colScheduled")}</label>
          <div className="flex gap-2">
            <Input
              id="scheduled-for"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={locked}
              className="w-44 bg-white/10 border-white/15 text-white [color-scheme:dark]"
            />
            <Button
              variant="secondary"
              onClick={saveDate}
              disabled={locked || busy !== null || date === (article.scheduledFor ?? "")}
            >
              {busy === "date" ? <Loader2 className="h-4 w-4 animate-spin" /> : t("adminNews.saveDate")}
            </Button>
          </div>
        </div>

        <div className="ms-auto flex flex-col items-end gap-1">
          {article.status !== "approved" && !locked && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={busy !== null || dirty} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="h-4 w-4 me-1" /> {t("adminNews.approve")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("adminNews.approveTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("adminNews.approveBody").replace("{n}", String(n))}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("adminNews.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={approve}>{t("adminNews.approve")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {dirty && article.status !== "approved" && <span className="text-[11px] text-amber-300">{t("adminNews.saveFirst")}</span>}
        </div>
      </div>

      <p className="text-xs text-white/50">{t("adminNews.editNote")}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Edit this language */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="nl-title" className="text-xs text-white/60">{t("adminNews.fieldTitle")}</label>
            <Input
              id="nl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={locked}
              dir={rtl ? "rtl" : "ltr"}
              className="bg-white/10 border-white/15 text-white"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="nl-content" className="text-xs text-white/60">{t("adminNews.fieldContent")}</label>
            <Textarea
              id="nl-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={locked}
              dir={rtl ? "rtl" : "ltr"}
              className="min-h-[28rem] font-mono text-xs bg-white/10 border-white/15 text-white"
            />
          </div>
          <Button onClick={saveText} disabled={locked || !dirty || busy !== null || !title.trim() || !content.trim()}>
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Save className="h-4 w-4 me-1" />}
            {t("adminNews.save")}
          </Button>
        </div>

        {/* Live preview of what is in the form */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="text-xs text-white/60">{t("adminNews.preview")}</div>
          <h2 className="text-lg font-semibold text-white" dir={rtl ? "rtl" : "ltr"}>{title}</h2>
          <NewsletterPreview markdown={content} rtl={rtl} />
        </div>
      </div>
    </div>
  );
}
