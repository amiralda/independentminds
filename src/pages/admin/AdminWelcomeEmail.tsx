import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Loader2, MailPlus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, type Lang } from "@/lib/i18n";
import { fromDbLang } from "@/lib/languagePref";
import { formatNewsletterDate } from "@/lib/newsletter";
import { NewsletterLangSelect, NewsletterPreview } from "@/components/admin/NewsletterBits";
import { EmailPreviewButton } from "@/components/admin/EmailPreviewButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// public.welcome_emails: one row per language (EN, HT, …). Admins may SELECT
// and UPDATE (title, content) only — no insert/delete, no migration needed.
export interface WelcomeVersion {
  language: string;
  title: string;
  content: string;
}

// public.welcome_email_sends: one row per person (read-only here).
export interface WelcomeSend {
  status: "sending" | "sent" | "failed" | "suppressed" | "existing";
  trigger: string;
  language: string | null;
  created_at: string;
}

export const SEND_STATUSES: WelcomeSend["status"][] = ["sent", "failed", "suppressed", "sending", "existing"];

export function summarizeSends(rows: WelcomeSend[]) {
  const byStatus = Object.fromEntries(SEND_STATUSES.map((s) => [s, 0])) as Record<WelcomeSend["status"], number>;
  const sentByLang: Record<string, number> = {};
  let lastSent: string | null = null;
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.status === "sent") {
      const l = r.language ?? "?";
      sentByLang[l] = (sentByLang[l] ?? 0) + 1;
      if (!lastSent || r.created_at > lastSent) lastSent = r.created_at;
    }
  }
  return { byStatus, sentByLang, lastSent, total: rows.length };
}

const versions = () => supabase.from("welcome_emails" as never);

export default function AdminWelcomeEmail() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<WelcomeVersion[] | null | undefined>(undefined);
  const [sends, setSends] = useState<WelcomeSend[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const available = useMemo(
    () => (rows ?? []).map((r) => fromDbLang(r.language)).filter((l): l is Lang => l !== null),
    [rows],
  );
  const wanted: Lang = fromDbLang(params.get("lang")) ?? fromDbLang(profile?.languagePref) ?? "EN";
  const lang: Lang = available.includes(wanted) ? wanted : available.includes("EN") ? "EN" : available[0] ?? "EN";
  const version = (rows ?? []).find((r) => r.language === lang) ?? null;
  const dirty = !!version && (title !== version.title || content !== version.content);

  const load = useCallback(async () => {
    const [v, s] = await Promise.all([
      versions().select("language, title, content"),
      supabase.from("welcome_email_sends" as never).select("status, trigger, language, created_at"),
    ]);
    if (v.error) {
      toast.error(`${t("adminWelcome.loadError")}: ${v.error.message}`);
      setRows(null);
      return;
    }
    setRows((v.data ?? []) as unknown as WelcomeVersion[]);
    setSends(s.error ? [] : ((s.data ?? []) as unknown as WelcomeSend[]));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // Load the form when the shown version changes (other language or after a save).
  useEffect(() => {
    if (version) { setTitle(version.title); setContent(version.content); }
  }, [version?.language, version?.title, version?.content]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchLang = (l: Lang) => {
    if (dirty && !window.confirm(t("adminNews.discard"))) return;
    setParams({ lang: l }, { replace: true });
  };

  // Re-reads the changed row: RLS turns a refused update into "0 rows"
  // instead of an error, so an empty result is reported as a failure.
  const save = async () => {
    if (!version) return;
    setSaving(true);
    try {
      const { data, error } = await versions()
        .update({ title, content } as never)
        .eq("language", version.language)
        .select("language");
      if (error) throw error;
      if (!data || (data as unknown[]).length !== 1) throw new Error(`${(data as unknown[] | null)?.length ?? 0}/1`);
      toast.success(t("adminNews.saved"));
      setConfirming(false);
      await load();
    } catch (e) {
      toast.error(`${t("adminNews.error")}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => summarizeSends(sends), [sends]);

  if (rows === undefined) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
  }
  if (rows === null || !version) {
    return <p className="text-white/60" data-testid="welcome-load-error">{t("adminWelcome.loadError")}</p>;
  }

  const rtl = lang === "AR";
  const langLabel = `${lang}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
          <MailPlus size={18} />
        </div>
        <div className="me-auto">
          <h1 className="text-2xl font-display font-bold text-white">{t("adminWelcome.title")}</h1>
          <p className="text-white/70 text-sm">{t("adminWelcome.subtitle")}</p>
        </div>
        <NewsletterLangSelect value={lang} options={available} onChange={switchLang} />
        <EmailPreviewButton title={title} markdown={content} lang={lang} dirty={dirty} note={t("adminWelcome.previewNote")} />
      </div>

      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-100 text-sm flex gap-2" data-testid="welcome-live-warning">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>{t("adminWelcome.liveWarning")}</span>
      </div>

      {/* Read-only statistics from welcome_email_sends */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3" data-testid="welcome-stats">
        <div className="text-sm font-semibold text-white">{t("adminWelcome.statsTitle")}</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {SEND_STATUSES.map((s) => (
            <div key={s} className="rounded-lg border border-white/10 bg-white/5 p-3" data-testid={`welcome-stat-${s}`}>
              <p className="text-[11px] uppercase tracking-wide text-white/60">{t(`adminWelcome.stat.${s}`)}</p>
              <p className="text-xl font-bold text-white">{stats.byStatus[s]}</p>
            </div>
          ))}
        </div>
        <div className="text-xs text-white/60 space-y-1">
          <div>
            {stats.lastSent
              ? t("adminWelcome.lastSent").replace("{date}", formatNewsletterDate(stats.lastSent) ?? "")
              : t("adminWelcome.noneSent")}
          </div>
          {Object.keys(stats.sentByLang).length > 0 && (
            <div data-testid="welcome-sent-by-lang">
              {t("adminWelcome.sentByLang")}:{" "}
              {Object.entries(stats.sentByLang).sort().map(([l, n]) => `${l} ${n}`).join(" · ")}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Edit this language */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="space-y-1">
            <label htmlFor="we-title" className="text-xs text-white/60">{t("adminNews.fieldTitle")}</label>
            <Input
              id="we-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              dir={rtl ? "rtl" : "ltr"}
              className="bg-white/10 border-white/15 text-white"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="we-content" className="text-xs text-white/60">{t("adminNews.fieldContent")}</label>
            <Textarea
              id="we-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              dir={rtl ? "rtl" : "ltr"}
              className="min-h-[28rem] font-mono text-xs bg-white/10 border-white/15 text-white"
            />
          </div>
          <Button onClick={() => setConfirming(true)} disabled={!dirty || saving || !title.trim() || !content.trim()}>
            <Save className="h-4 w-4 me-1" />
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

      <AlertDialog open={confirming} onOpenChange={(open) => { if (!saving) setConfirming(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminWelcome.confirmTitle").replace("{lang}", langLabel)}</AlertDialogTitle>
            <AlertDialogDescription>{t("adminWelcome.confirmBody").replace("{lang}", langLabel)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t("adminNews.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => { e.preventDefault(); void save(); }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {t("adminWelcome.confirmSave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
