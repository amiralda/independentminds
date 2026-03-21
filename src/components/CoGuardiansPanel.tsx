import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, Shield, Trash2, Mail, Copy, Check } from "lucide-react";

interface Props {
  studentId: string;
}

export function CoGuardiansPanel({ studentId }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const { data: guardians = [] } = useQuery({
    queryKey: ["co_guardians", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("co_guardians")
        .select("*")
        .eq("student_id", studentId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["guardian_invites", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardian_invites")
        .select("*")
        .eq("student_id", studentId)
        .in("status", ["pending"]);
      if (error) throw error;
      return data || [];
    },
  });

  const sendInvite = async () => {
    if (!email.trim() || !user) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-guardian-invite", {
        body: {
          student_id: studentId,
          invitee_email: email.trim().toLowerCase(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.email_sent ? t("guardians.invite_sent") : data?.message || t("guardians.invite_sent"));
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["guardian_invites", studentId] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const updatePermission = async (guardianId: string, field: string, value: boolean) => {
    const updates: any = { [field]: value };
    // Full access toggle: enable all when ON
    if (field === "is_full_access" && value) {
      updates.can_view_progress = true;
      updates.can_receive_sos = true;
      updates.can_approve_rewards = true;
      updates.can_edit_lessons = true;
    }
    const { error } = await supabase
      .from("co_guardians")
      .update(updates)
      .eq("id", guardianId);
    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["co_guardians", studentId] });
    }
  };

  const revokeGuardian = async (guardianId: string) => {
    const { error } = await supabase
      .from("co_guardians")
      .delete()
      .eq("id", guardianId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("guardians.revoke"));
      queryClient.invalidateQueries({ queryKey: ["co_guardians", studentId] });
    }
  };

  const revokeInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from("guardian_invites")
      .update({ status: "revoked" } as any)
      .eq("id", inviteId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["guardian_invites", studentId] });
  };

  const permissions = [
    { key: "can_view_progress", label: t("guardians.view_progress"), locked: true },
    { key: "can_receive_sos", label: t("guardians.receive_sos") },
    { key: "can_approve_rewards", label: t("guardians.approve_rewards") },
    { key: "can_edit_lessons", label: t("guardians.edit_lessons") },
    { key: "is_full_access", label: t("guardians.full_access") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          {t("guardians.title")}
        </h3>
      </div>

      {/* Invite form */}
      <div className="flex gap-2">
        <Input
          placeholder={t("guardians.invite_placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="flex-1"
        />
        <Button onClick={sendInvite} disabled={sending || !email.trim()} size="sm">
          <UserPlus size={16} className="mr-1" />
          {t("guardians.send_invite")}
        </Button>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="space-y-2">
          {invites.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-muted-foreground" />
                <span className="text-sm">{inv.invitee_email}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-medium">
                  {t("guardians.pending")}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Active guardians */}
      {guardians.length === 0 && invites.length === 0 && (
        <p className="text-center text-muted-foreground py-6 text-sm">
          {t("guardians.no_guardians")}
        </p>
      )}

      {guardians.map((g: any) => (
        <div key={g.id} className="border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Guardian</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 font-medium">
                  {t("guardians.active")}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => revokeGuardian(g.id)}
            >
              <Trash2 size={14} className="mr-1" />
              {t("guardians.revoke")}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("guardians.permissions")}
            </p>
            {permissions.map(({ key, label, locked }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm">{label}</span>
                <Switch
                  checked={g[key] ?? false}
                  disabled={locked || (key !== "is_full_access" && g.is_full_access)}
                  onCheckedChange={(val) => updatePermission(g.id, key, val)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
