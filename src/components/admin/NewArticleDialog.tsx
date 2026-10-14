import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Plus, RotateCcw, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { formatNewsletterDate as fmtDate } from "@/lib/newsletter";
import { readFunctionError } from "@/components/StudentLoginInvite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
// Same validation as the generate-article function.
import {
  TRANSLATION_LANGUAGES, campaignFromTopic, checkScheduledFor, isValidCampaign, type ScheduleCheck,
} from "../../../supabase/functions/_shared/article-generation";
import { haitiDate } from "../../../supabase/functions/_shared/haiti-time";

type StepState = { state: "waiting" | "running" | "ok" | "error"; error?: string };
type Lang9 = (typeof TRANSLATION_LANGUAGES)[number];

async function invoke(body: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("generate-article", { body });
  const failure = await readFunctionError(data, error);
  if (failure) return { data: null, error: failure.error ?? (error instanceof Error ? error.message : "Error") };
  return { data: data as Record<string, unknown>, error: null };
}

/**
 * "New article": topic + Saturday + campaign → generate-article writes the
 * English version, then the 9 translations one after the other. Every row is
 * pending_approval; nothing is sent. A failed language can be retried alone.
 */
export function NewArticleDialog() {
  const { t, languages } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState("");
  const [campaign, setCampaign] = useState("");
  const [campaignEdited, setCampaignEdited] = useState(false);
  const [running, setRunning] = useState(false);
  const [warn, setWarn] = useState(false);
  const [english, setEnglish] = useState<StepState & { title?: string; content?: string }>({ state: "waiting" });
  const [steps, setSteps] = useState<Record<Lang9, StepState> | null>(null);
  const started = english.state !== "waiting";
  // The campaign actually created (the field may not change after start).
  const created = useRef("");

  const today = haitiDate();
  const dateCheck = date ? checkScheduledFor(date, today) : null;
  // tsconfig.app is not strict, so the union does not narrow on `ok`.
  const dateHint = dateCheck && !dateCheck.ok ? (dateCheck as Extract<ScheduleCheck, { ok: false }>) : null;

  useEffect(() => {
    if (!campaignEdited) setCampaign(topic.trim() ? campaignFromTopic(topic, date || today) : "");
  }, [topic, date, campaignEdited, today]);

  // Leaving the page while it runs would stop the translations halfway.
  useEffect(() => {
    if (!running) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [running]);

  const reset = () => {
    setTopic(""); setDate(""); setCampaign(""); setCampaignEdited(false);
    setEnglish({ state: "waiting" }); setSteps(null); setWarn(false); created.current = "";
  };

  const allDone = (s: Record<Lang9, StepState> | null) => !!s && TRANSLATION_LANGUAGES.every((l) => s[l].state === "ok");

  const translate = async (language: Lang9, current: Record<Lang9, StepState>) => {
    current = { ...current, [language]: { state: "running" } };
    setSteps(current);
    const { error } = await invoke({ action: "translate", campaign: created.current, language });
    current = { ...current, [language]: error ? { state: "error", error } : { state: "ok" } };
    setSteps(current);
    return current;
  };

  const finish = (s: Record<Lang9, StepState>) => {
    setRunning(false);
    if (allDone(s)) navigate(`/admin/newsletter/${encodeURIComponent(created.current)}`);
  };

  const generate = async () => {
    setRunning(true);
    setWarn(false);
    setEnglish({ state: "running" });
    const { data, error } = await invoke({ action: "draft", topic, scheduled_for: date, campaign });
    if (error || !data) {
      setEnglish({ state: "error", error: error ?? "Error" });
      setRunning(false);
      return;
    }
    created.current = campaign;
    setEnglish({ state: "ok", title: String(data.title ?? ""), content: String(data.content ?? "") });
    let s = Object.fromEntries(TRANSLATION_LANGUAGES.map((l) => [l, { state: "waiting" }])) as Record<Lang9, StepState>;
    setSteps(s);
    for (const l of TRANSLATION_LANGUAGES) s = await translate(l, s);
    finish(s);
  };

  const retry = async (language: Lang9) => {
    if (!steps) return;
    setRunning(true);
    finish(await translate(language, steps));
  };

  const onOpenChange = (next: boolean) => {
    if (next) { setOpen(true); return; }
    if (running) { setWarn(true); return; }
    if (steps && !allDone(steps) && !window.confirm(t("adminNews.gen.closeIncomplete"))) return;
    setOpen(false);
    reset();
  };

  const langLabel = (code: string) => {
    const l = languages.find((x) => x.code === code);
    return l ? `${l.flag} ${l.label}` : code;
  };
  const englishFailed = english.state === "error";
  const canGenerate = (!started || englishFailed) && !running && topic.trim() !== "" && dateCheck?.ok === true && isValidCampaign(campaign);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="new-article-open">
          <Plus className="h-4 w-4 me-1" /> {t("adminNews.gen.open")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => { if (running) { e.preventDefault(); setWarn(true); } }}
        onEscapeKeyDown={(e) => { if (running) { e.preventDefault(); setWarn(true); } }}
      >
        <DialogHeader>
          <DialogTitle>{t("adminNews.gen.open")}</DialogTitle>
          <DialogDescription>{t("adminNews.gen.intro")}</DialogDescription>
        </DialogHeader>

        {warn && running && (
          <div role="alert" data-testid="gen-working-warning" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-600">
            {t("adminNews.gen.working")}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="gen-topic" className="text-sm font-medium">{t("adminNews.gen.topic")}</label>
            <Textarea
              id="gen-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={started && !englishFailed}
              className="min-h-[8rem]"
            />
            <p className="text-xs text-muted-foreground">{t("adminNews.gen.topicHint")}</p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <label htmlFor="gen-date" className="text-sm font-medium">{t("adminNews.colScheduled")}</label>
              <Input
                id="gen-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={started && !englishFailed}
                className="w-44"
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[14rem]">
              <label htmlFor="gen-campaign" className="text-sm font-medium">{t("adminNews.gen.campaign")}</label>
              <Input
                id="gen-campaign"
                value={campaign}
                onChange={(e) => { setCampaign(e.target.value); setCampaignEdited(true); }}
                disabled={started && !englishFailed}
                aria-invalid={campaign !== "" && !isValidCampaign(campaign)}
                className="font-mono text-xs"
              />
              <p className={`text-xs ${campaign !== "" && !isValidCampaign(campaign) ? "text-red-500" : "text-muted-foreground"}`}>
                {t("adminNews.gen.campaignHint")}
              </p>
            </div>
          </div>

          {dateHint?.suggestion && (
            <div data-testid="gen-date-hint" className="flex flex-wrap items-center gap-2 text-sm text-amber-600">
              <span>
                {t(dateHint.reason === "past" ? "adminNews.gen.pastDate" : "adminNews.gen.notSaturday")
                  .replace("{date}", fmtDate(dateHint.suggestion) ?? dateHint.suggestion)}
              </span>
              <Button size="sm" variant="secondary" onClick={() => setDate(dateHint.suggestion!)} disabled={started && !englishFailed}>
                {t("adminNews.gen.useDate")}
              </Button>
            </div>
          )}

          {(!started || englishFailed) && (
            <Button onClick={generate} disabled={!canGenerate} data-testid="gen-submit">
              {t("adminNews.gen.generate")}
            </Button>
          )}

          {started && (
            <ul className="space-y-1 text-sm" data-testid="gen-progress">
              <ProgressRow label={t("adminNews.gen.english")} step={english} lang="EN" />
              {english.state === "ok" && english.title && (
                <li className="ms-6 rounded-md border p-2 text-xs space-y-1" data-testid="gen-english-preview">
                  <div className="font-semibold">{english.title}</div>
                  <div className="text-muted-foreground line-clamp-4 whitespace-pre-line">{english.content}</div>
                </li>
              )}
              {steps && TRANSLATION_LANGUAGES.map((l) => (
                <ProgressRow
                  key={l}
                  lang={l}
                  label={langLabel(l)}
                  step={steps[l]}
                  onRetry={!running && steps[l].state === "error" ? () => retry(l) : undefined}
                  retryLabel={t("adminNews.gen.retry")}
                />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgressRow({
  label, step, lang, onRetry, retryLabel,
}: { label: string; step: StepState; lang: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <li data-lang={lang} data-state={step.state} className="flex flex-wrap items-center gap-2">
      {step.state === "running" && <Loader2 className="h-4 w-4 animate-spin" />}
      {step.state === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="✓" />}
      {step.state === "error" && <XCircle className="h-4 w-4 text-red-500" aria-label="✗" />}
      {step.state === "waiting" && <span className="h-4 w-4 inline-block rounded-full border" />}
      <span>{label}</span>
      {step.state === "error" && <span className="text-xs text-red-500">{step.error}</span>}
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} data-testid={`gen-retry-${lang}`}>
          <RotateCcw className="h-3 w-3 me-1" /> {retryLabel}
        </Button>
      )}
    </li>
  );
}
