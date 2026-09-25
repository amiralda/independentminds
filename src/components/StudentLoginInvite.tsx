import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, RotateCcw, UserCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FunctionErrorBody {
  error?: string;
  code?: string;
  retry_after_seconds?: number;
}

/**
 * functions.invoke puts non-2xx bodies on error.context; returns the server's
 * JSON error body (or the 2xx body's error), null when the call succeeded.
 */
export async function readFunctionError(data: unknown, error: unknown): Promise<FunctionErrorBody | null> {
  const body = data as FunctionErrorBody | null;
  if (!error && !body?.error) return null;
  if (body?.error) return body;
  if (error && typeof error === "object" && "context" in error) {
    try { return (await (error as { context: Response }).context.json()) as FunctionErrorBody; } catch { /* ignore */ }
  }
  return {};
}

/** "Please wait X minutes" text for a rate_limited response (minutes rounded up). */
export function rateLimitMessage(t: (key: string) => string, retryAfterSeconds?: number): string {
  const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? 15 * 60) / 60));
  return t("auth.resetRateLimited").replace("{{minutes}}", String(minutes));
}

/**
 * Creates a login account for an existing student via create-student-account
 * and returns the "set your password" link (null + toast on failure).
 */
export async function createStudentLogin(studentId: string, email: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("create-student-account", {
    body: { student_id: studentId, email: email.trim() },
  });
  const failure = await readFunctionError(data, error);
  if (failure) {
    toast.error(failure.error || "Could not create the student login");
    return null;
  }
  return (data?.invite_link as string | null) ?? null;
}

/**
 * Gets a fresh "set your password" link for a student who already has a login
 * via reset-student-password (null + toast on failure, incl. the 15-min limit).
 */
async function resetStudentPassword(studentId: string, t: (key: string) => string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("reset-student-password", {
    body: { student_id: studentId },
  });
  const failure = await readFunctionError(data, error);
  if (failure) {
    toast.error(failure.code === "rate_limited"
      ? rateLimitMessage(t, failure.retry_after_seconds)
      : t("studentLogin.resetFailed"));
    return null;
  }
  return (data?.reset_link as string | null) ?? null;
}

export function InviteLinkBox({ link }: { link: string }) {
  const { t } = useI18n();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("studentLogin.copied"));
    } catch {
      toast.error(t("studentLogin.copyFailed"));
    }
  };
  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
      <p className="text-xs font-medium">{t("studentLogin.linkLabel")}</p>
      <div className="flex gap-2">
        <Input value={link} readOnly className="text-xs" data-testid="student-invite-link" />
        <Button variant="outline" size="sm" onClick={copy} aria-label={t("studentLogin.copy")}>
          <Copy size={14} />
        </Button>
      </div>
    </div>
  );
}

interface Props {
  studentId: string;
  hasLogin: boolean;
  onCreated?: () => void;
}

export function StudentLoginInvite({ studentId, hasLogin, onCreated }: Props) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  if (hasLogin) {
    const reset = async () => {
      setResetting(true);
      const created = await resetStudentPassword(studentId, t);
      setResetting(false);
      if (created) {
        setLink(created);
        toast.success(t("studentLogin.resetCreated"));
      }
    };
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <UserCheck size={16} className="text-primary" />
            {t("studentLogin.hasAccount")}
          </span>
          <Button variant="outline" size="sm" onClick={reset} disabled={resetting} data-testid="student-reset-password">
            {resetting ? <Loader2 size={14} className="mr-2 animate-spin" /> : <RotateCcw size={14} className="mr-2" />}
            {t("studentLogin.resetPassword")}
          </Button>
        </div>
        {link && <InviteLinkBox link={link} />}
      </div>
    );
  }

  const create = async () => {
    setCreating(true);
    const created = await createStudentLogin(studentId, email);
    setCreating(false);
    if (created) {
      setLink(created);
      toast.success(t("studentLogin.created"));
      onCreated?.();
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <KeyRound size={16} />
        {t("studentLogin.title")}
      </div>
      {link ? (
        <InviteLinkBox link={link} />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t("studentLogin.desc")}</p>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("studentLogin.emailLabel")}
              aria-label={t("studentLogin.emailLabel")}
            />
            <Button onClick={create} disabled={creating || !email.trim()} className="font-display">
              {creating && <Loader2 size={14} className="mr-2 animate-spin" />}
              {t("studentLogin.create")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
