import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface Props {
  onComplete: () => void;
  isAlreadyLinked: boolean;
}

type WizardStep = 1 | 2 | 3;

export function TelegramSetupWizard({ onComplete, isAlreadyLinked }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [step, setStep] = useState<WizardStep>(isAlreadyLinked ? 3 : 1);
  const [deepLink, setDeepLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [linked, setLinked] = useState(isAlreadyLinked);

  const generateLink = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-link", {
        body: { action: "generate" },
      });
      if (error) throw error;
      if (data?.deep_link) {
        setDeepLink(data.deep_link);
        setStep(2);
      }
    } catch (err: unknown) {
      toast.error(err.message || t("telegram.wizard.error"));
    } finally {
      setGenerating(false);
    }
  }, [user, t]);

  // Poll for link completion when on step 2
  useEffect(() => {
    if (step !== 2 || !deepLink) return;
    setPolling(true);
    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        try {
          const { data } = await supabase.functions.invoke("telegram-link", {
            body: { action: "check" },
          });
          if (data?.linked) {
            setLinked(true);
            setStep(3);
            toast.success(t("telegram.wizard.connected"));
            onComplete();
            break;
          }
        } catch {
          // Ignore polling errors
        }
        // Wait 3 seconds between polls
        await new Promise((r) => setTimeout(r, 3000));
      }
      setPolling(false);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [step, deepLink, t, onComplete]);

  const progressValue = step === 1 ? 0 : step === 2 ? 50 : 100;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {t("telegram.wizard.step")} {step}/3
          </span>
          <span>{progressValue}%</span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      {/* Step 1: Generate link */}
      {step === 1 && (
        <div className="rounded-xl bg-card border p-5 space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle size={28} className="text-primary" />
          </div>
          <h4 className="font-display font-medium text-base">
            {t("telegram.wizard.step1.title")}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t("telegram.wizard.step1.desc")}
          </p>
          <Button
            onClick={generateLink}
            disabled={generating}
            className="w-full font-display"
          >
            {generating ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <ExternalLink size={16} className="mr-2" />
            )}
            {t("telegram.wizard.step1.button")}
          </Button>
        </div>
      )}

      {/* Step 2: Open Telegram and press START */}
      {step === 2 && (
        <div className="rounded-xl bg-card border p-5 space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
            <MessageCircle size={28} className="text-accent-foreground" />
          </div>
          <h4 className="font-display font-medium text-base">
            {t("telegram.wizard.step2.title")}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t("telegram.wizard.step2.desc")}
          </p>

          <Button
            asChild
            className="w-full font-display bg-[#0088cc] hover:bg-[#0088cc]/90 text-white"
          >
            <a href={deepLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} className="mr-2" />
              {t("telegram.wizard.step2.button")}
            </a>
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {polling && <Loader2 size={12} className="animate-spin" />}
            <span>{t("telegram.wizard.step2.waiting")}</span>
          </div>
        </div>
      )}

      {/* Step 3: Connected */}
      {step === 3 && (
        <div className="rounded-xl bg-card border p-5 space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h4 className="font-display font-medium text-base">
            {linked
              ? t("telegram.wizard.step3.title")
              : t("telegram.wizard.step3.titlePending")}
          </h4>
          <p className="text-sm text-muted-foreground">
            {t("telegram.wizard.step3.desc")}
          </p>

          {!linked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStep(1);
                setDeepLink("");
              }}
            >
              <RefreshCw size={14} className="mr-1" />
              {t("telegram.wizard.retry")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
