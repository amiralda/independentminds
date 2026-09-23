import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Copy, Loader2, UserPlus, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface ManagedFamily {
  parent_id: string;
  display_name: string | null;
  email: string | null;
  student_count: number;
  added_at: string;
}

export function ManagerDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // get_my_managed_families() is scoped server-side to manager_parents rows
  // where manager_id = auth.uid() -- the same link the families' RLS uses --
  // and returns only this summary, never the parents' full profiles.
  const { data: families = [], isLoading, error } = useQuery({
    queryKey: ["managed-families", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("get_my_managed_families" as any);
      if (rpcError) throw rpcError;
      return (data ?? []) as ManagedFamily[];
    },
  });

  const createFamily = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setCreating(true);
    setInviteLink(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("manager-create-parent", {
        body: { email: trimmedEmail, display_name: displayName.trim() || undefined },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      toast.success(t("manager.familyCreated"));
      setInviteLink((data?.invite_link as string | null) ?? null);
      setEmail("");
      setDisplayName("");
      await queryClient.invalidateQueries({ queryKey: ["managed-families", user?.id] });
    } catch (err: unknown) {
      console.error("manager-create-parent:", err);
      toast.error((err as Error).message || t("manager.createError"));
    } finally {
      setCreating(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success(t("manager.linkCopied"));
    } catch {
      toast.error(t("manager.copyFailed"));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Briefcase size={20} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{t("manager.dashboardTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("manager.dashboardSubtitle")}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm((v) => !v)} className="font-display">
          <UserPlus size={16} className="mr-2" />
          {t("manager.addFamily")}
        </Button>
      </div>

      {showAddForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t("manager.addFamilyDesc")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">{t("manager.parentEmail")} *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="parent@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium">{t("manager.parentName")}</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <Button onClick={createFamily} disabled={creating || !email.trim()} className="font-display">
            {creating && <Loader2 size={16} className="mr-2 animate-spin" />}
            {t("manager.createFamily")}
          </Button>
          {inviteLink && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-medium">{t("manager.inviteLinkLabel")}</p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button variant="outline" size="sm" onClick={copyInviteLink} aria-label={t("manager.copyLink")}>
                  <Copy size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 font-semibold">
          <Users size={16} />
          {t("manager.families")} ({families.length})
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <p className="p-4 text-sm text-destructive">{t("manager.loadError")}</p>
        ) : families.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{t("manager.noFamilies")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">{t("manager.parentName")}</th>
                  <th className="text-left px-4 py-2">{t("manager.studentCount")}</th>
                  <th className="text-left px-4 py-2">{t("manager.addedOn")}</th>
                </tr>
              </thead>
              <tbody>
                {families.map((f) => (
                  <tr key={f.parent_id} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium">{f.display_name || f.email || "—"}</div>
                      {f.email && f.display_name && <div className="text-xs text-muted-foreground">{f.email}</div>}
                    </td>
                    <td className="px-4 py-2">{f.student_count}</td>
                    <td className="px-4 py-2">{new Date(f.added_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
