import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, UserCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Creates a login account for an existing student via create-student-account
 * and returns the "set your password" link (null + toast on failure).
 */
export async function createStudentLogin(studentId: string, email: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("create-student-account", {
    body: { student_id: studentId, email: email.trim() },
  });
  if (error || data?.error) {
    // functions.invoke puts non-2xx bodies on error.context; surface the server message.
    let message = data?.error as string | undefined;
    if (!message && error && "context" in error) {
      try { message = (await (error as { context: Response }).context.json())?.error; } catch { /* ignore */ }
    }
    toast.error(message || "Could not create the student login");
    return null;
  }
  return (data?.invite_link as string | null) ?? null;
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

  if (hasLogin && !link) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center gap-2 text-sm">
        <UserCheck size={16} className="text-primary" />
        {t("studentLogin.hasAccount")}
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
