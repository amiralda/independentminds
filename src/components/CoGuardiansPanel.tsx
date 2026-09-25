import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Loader2, Mail, Shield, Trash2, UserPlus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InviteLinkBox, readFunctionError } from "@/components/StudentLoginInvite";

interface Props {
  // Kept for the DadPanel call site; co-guardians are per family, not per student.
  studentId?: string;
}

interface PendingInvite {
  id: string;
  email: string;
  expires_at: string | null;
}

interface CoGuardian {
  id: string;
  guardian_id: string;
  email: string | null;
  display_name: string | null;
  invited_at: string | null;
}

const ERROR_CODES = ["invalid_email", "self_invite", "already_guardian", "student_account", "not_primary_parent"];

/** Creates (or re-issues) the invite link for an email; null + toast on failure. */
async function requestInviteLink(email: string, t: (key: string) => string) {
  const { data, error } = await supabase.functions.invoke("send-guardian-invite", { body: { email } });
  const failure = await readFunctionError(data, error);
  if (failure) {
    toast.error(t(failure.code && ERROR_CODES.includes(failure.code) ? `coGuardian.err.${failure.code}` : "coGuardian.err.generic"));
    return null;
  }
  return data as { invite_link: string; needs_password: boolean };
}

export function CoGuardiansPanel(_props: Props) {
  const { t } = useI18n();
  const { user, students } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ link: string; needsPassword: boolean } | null>(null);

  // Only the primary parent (owns at least one student) manages co-guardians.
  const isOwner = !!user && students.some((s) => s.parent_id === user.id);

  const { data: invites = [] } = useQuery({
    queryKey: ["guardian_invites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardian_invites")
        .select("id, email, expires_at")
        .eq("parent_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PendingInvite[];
    },
    enabled: isOwner,
  });

  const { data: guardians = [] } = useQuery({
    queryKey: ["co_guardians", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_co_guardians" as never);
      if (error) throw error;
      return (data || []) as unknown as CoGuardian[];
    },
    enabled: isOwner,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["guardian_invites"] });
    queryClient.invalidateQueries({ queryKey: ["co_guardians"] });
    queryClient.invalidateQueries({ queryKey: ["student_co_guardians_display"] });
  };

  const createInvite = async () => {
    if (!email.trim()) return;
    setCreating(true);
    const res = await requestInviteLink(email.trim(), t);
    setCreating(false);
    if (res) {
      setCreated({ link: res.invite_link, needsPassword: res.needs_password });
      setEmail("");
      refresh();
    }
  };

  // Re-issues a fresh link for a pending invite (same invite, new sign-in link).
  const copyInvite = async (inviteEmail: string) => {
    const res = await requestInviteLink(inviteEmail, t);
    if (!res) return;
    try {
      await navigator.clipboard.writeText(res.invite_link);
      toast.success(t("guardians.link_copied"));
    } catch {
      setCreated({ link: res.invite_link, needsPassword: res.needs_password });
    }
  };

  const cancelInvite = async (id: string) => {
    const { error } = await supabase.from("guardian_invites").update({ status: "revoked" } as never).eq("id", id);
    if (error) toast.error(t("coGuardian.err.generic"));
    else {
      toast.success(t("coGuardian.cancelled"));
      refresh();
    }
  };

  const removeGuardian = async (id: string) => {
    if (!window.confirm(t("coGuardian.removeConfirm"))) return;
    const { error } = await supabase.from("co_guardians").delete().eq("id", id);
    if (error) toast.error(t("coGuardian.err.generic"));
    else {
      toast.success(t("coGuardian.removed"));
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          {t("coGuardian.title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("coGuardian.desc")}</p>
      </div>

      {!isOwner ? (
        <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">{t("coGuardian.onlyOwner")}</p>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("coGuardian.emailPlaceholder")}
                aria-label={t("coGuardian.emailPlaceholder")}
                className="flex-1"
              />
              <Button onClick={createInvite} disabled={creating || !email.trim()} className="font-display" data-testid="co-guardian-generate">
                {creating ? <Loader2 size={14} className="mr-2 animate-spin" /> : <UserPlus size={14} className="mr-2" />}
                {t("coGuardian.generate")}
              </Button>
            </div>
            {created && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {t("coGuardian.linkReady")} {created.needsPassword && t("coGuardian.linkNewAccount")}
                </p>
                <InviteLinkBox link={created.link} />
              </div>
            )}
          </div>

          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("coGuardian.pending")}</p>
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail size={16} className="text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{inv.email}</p>
                      {inv.expires_at && (
                        <p className="text-[10px] text-muted-foreground">
                          {t("coGuardian.expires").replace("{{date}}", new Date(inv.expires_at).toLocaleDateString())}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => copyInvite(inv.email)} aria-label={t("coGuardian.copyLink")}>
                      <Copy size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => cancelInvite(inv.id)} aria-label={t("coGuardian.cancelInvite")}>
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {guardians.length === 0 && invites.length === 0 && (
              <p className="text-center text-muted-foreground py-6 text-sm">{t("coGuardian.none")}</p>
            )}
            {guardians.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-2 border rounded-xl p-4" data-testid="co-guardian-row">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{g.display_name || g.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {g.email} · {t("coGuardian.sameAccess")}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeGuardian(g.id)}>
                  <Trash2 size={14} className="mr-1" />
                  {t("coGuardian.remove")}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
