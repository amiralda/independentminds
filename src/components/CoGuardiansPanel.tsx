import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Info, Loader2, Mail, Shield, Trash2, UserPlus, Users, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { initials, secondaryName } from "@/lib/coGuardianDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  // Set when the invite is accepted, so it is the "co-guardian since" date.
  invited_at: string | null;
}

const ERROR_CODES = ["invalid_email", "self_invite", "already_guardian", "student_account", "not_primary_parent"];

/** Intl has no Haitian Creole month names; French is the closest readable format. */
const dateLocale = (lang: string) => (lang === "HT" ? "fr" : lang.toLowerCase());

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
  const { t, lang } = useI18n();
  const { user, students } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ link: string; needsPassword: boolean } | null>(null);
  const [toRemove, setToRemove] = useState<CoGuardian | null>(null);
  const [removing, setRemoving] = useState(false);

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

  const confirmRemove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    const { error } = await supabase.from("co_guardians").delete().eq("id", toRemove.id);
    setRemoving(false);
    if (error) {
      toast.error(t("coGuardian.err.generic"));
      return;
    }
    toast.success(t("coGuardian.removed"));
    setToRemove(null);
    refresh();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(dateLocale(lang), { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return new Date(iso).toLocaleDateString();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          {t("coGuardian.sectionTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("coGuardian.desc")}</p>
      </div>

      {!isOwner ? (
        <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">{t("coGuardian.onlyOwner")}</p>
      ) : (
        <>
          <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm" data-testid="co-guardian-scope-note">
            <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-foreground/80">{t("coGuardian.allStudentsNote")}</p>
          </div>

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
                {creating ? <Loader2 size={14} className="me-2 animate-spin" /> : <UserPlus size={14} className="me-2" />}
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

          {guardians.length === 0 && invites.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-2 rounded-xl border border-dashed py-8 px-4" data-testid="co-guardian-empty">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Users size={22} className="text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">{t("coGuardian.emptyTitle")}</p>
              <p className="text-xs text-muted-foreground max-w-xs">{t("coGuardian.emptyDesc")}</p>
            </div>
          ) : (
            <>
              {guardians.length > 0 && (
                <section className="space-y-2" aria-labelledby="co-guardian-active-heading">
                  <h4 id="co-guardian-active-heading" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("coGuardian.active")}
                    <span className="ms-2 rounded-full bg-muted px-2 py-0.5">{guardians.length}</span>
                  </h4>
                  {guardians.map((g) => {
                    const name = secondaryName(g.email, g.display_name);
                    return (
                      <div key={g.id} className="flex items-center justify-between gap-3 border rounded-xl p-4 bg-card" data-testid="co-guardian-row">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-full bg-primary/10 text-primary font-display font-semibold flex items-center justify-center flex-shrink-0"
                            aria-hidden="true"
                          >
                            {initials(g.email, g.display_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{g.email ?? name}</p>
                            {name && g.email && <p className="text-xs text-muted-foreground truncate">{name}</p>}
                            {g.invited_at && (
                              <p className="text-[11px] text-muted-foreground">{t("coGuardian.since").replace("{{date}}", formatDate(g.invited_at))}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => setToRemove(g)}
                          data-testid="co-guardian-remove"
                        >
                          <Trash2 size={14} className="me-1" />
                          {t("coGuardian.remove")}
                        </Button>
                      </div>
                    );
                  })}
                </section>
              )}

              {invites.length > 0 && (
                <section className="space-y-2" aria-labelledby="co-guardian-pending-heading">
                  <h4 id="co-guardian-pending-heading" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("coGuardian.pending")}
                    <span className="ms-2 rounded-full bg-muted px-2 py-0.5">{invites.length}</span>
                  </h4>
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail size={16} className="text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{inv.email}</p>
                          {inv.expires_at && (
                            <p className="text-[10px] text-muted-foreground">
                              {t("coGuardian.expires").replace("{{date}}", formatDate(inv.expires_at))}
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
                </section>
              )}
            </>
          )}
        </>
      )}

      <AlertDialog open={!!toRemove} onOpenChange={(open) => !open && !removing && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("coGuardian.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("coGuardian.removeDesc").replace("{{email}}", toRemove?.email ?? toRemove?.display_name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{t("coGuardian.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open until the DELETE settles.
                e.preventDefault();
                confirmRemove();
              }}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="co-guardian-remove-confirm"
            >
              {removing && <Loader2 size={14} className="me-2 animate-spin" />}
              {t("coGuardian.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
