import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, Shield, Trash2, Mail, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { buildAppUrl } from "@/lib/siteUrl";

interface Props {
  studentId: string;
}

export function CoGuardiansPanel({ studentId }: Props) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  // Permissions to set before sending invite
  const [invitePerms, setInvitePerms] = useState({
    can_receive_sos: false,
    can_approve_rewards: false,
    can_edit_lessons: false,
    is_full_access: false,
  });

  const copyInviteLink = async (token: string, id: string) => {
    const link = buildAppUrl(`/accept-invite?token=${token}`);
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success(t("guardians.link_copied") || "Invite link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const toggleInvitePerm = (key: string, value: boolean) => {
    if (key === "is_full_access") {
      if (value) {
        setInvitePerms({
          can_receive_sos: true,
          can_approve_rewards: true,
          can_edit_lessons: true,
          is_full_access: true,
        });
      } else {
        setInvitePerms(prev => ({ ...prev, is_full_access: false }));
      }
    } else {
      setInvitePerms(prev => ({ ...prev, [key]: value }));
    }
  };

  const sendInvite = async () => {
    if (!email.trim() || !user) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-guardian-invite", {
        body: {
          student_id: studentId,
          invitee_email: email.trim().toLowerCase(),
          permissions: {
            can_view_progress: true,
            ...invitePerms,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.email_sent ? t("guardians.invite_sent") : data?.message || t("guardians.invite_sent"));
      setEmail("");
      setShowPermissions(false);
      setInvitePerms({ can_receive_sos: false, can_approve_rewards: false, can_edit_lessons: false, is_full_access: false });
      queryClient.invalidateQueries({ queryKey: ["guardian_invites", studentId] });
    } catch (err: unknown) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const updatePermission = async (guardianId: string, field: string, value: boolean) => {
    const updates: unknown = { [field]: value };
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

  const permissionsList = [
    { key: "can_view_progress", label: t("guardians.view_progress"), locked: true },
    { key: "can_receive_sos", label: t("guardians.receive_sos") },
    { key: "can_approve_rewards", label: t("guardians.approve_rewards") },
    { key: "can_edit_lessons", label: t("guardians.edit_lessons") },
    { key: "is_full_access", label: t("guardians.full_access") },
  ];

  const invitePermsList = [
    { key: "can_receive_sos", label: t("guardians.receiveSOS") },
    { key: "can_approve_rewards", label: t("guardians.approveRewards_label") },
    { key: "can_edit_lessons", label: t("guardians.editLessons") },
    { key: "is_full_access", label: t("guardians.fullAccessLabel") },
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
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder={t("guardians.invite_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="flex-1"
          />
          <Button
            onClick={() => setShowPermissions(!showPermissions)}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            disabled={!email.trim()}
          >
            {showPermissions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span className="ml-1 hidden sm:inline">
              {t("guardians.permissions_label")}
            </span>
          </Button>
        </div>

        {/* Permission selection before sending */}
        {showPermissions && email.trim() && (
          <div className="border rounded-xl p-4 space-y-3 bg-muted/30 animate-fade-in">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("guardians.permissionsQuestion")}
            </p>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">
                {t("guardians.viewProgress")}
              </span>
              <Switch checked={true} disabled />
            </div>
            {invitePermsList.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm">{label}</span>
                <Switch
                  checked={invitePerms[key as keyof typeof invitePerms]}
                  disabled={key !== "is_full_access" && invitePerms.is_full_access}
                  onCheckedChange={(val) => toggleInvitePerm(key, val)}
                />
              </div>
            ))}
          </div>
        )}

        <Button onClick={sendInvite} disabled={sending || !email.trim()} size="sm" className="w-full sm:w-auto">
          <UserPlus size={16} className="mr-1" />
          {t("guardians.sendInviteAsParent")}
        </Button>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="space-y-2">
          {invites.map((inv: unknown) => (
            <div key={inv.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Mail size={16} className="text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{inv.invitee_email}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-medium flex-shrink-0">
                  {t("guardians.pending")}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyInviteLink(inv.token, inv.id)}
                  title="Copy invite link"
                >
                  {copiedId === inv.id ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
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

      {guardians.map((g: unknown) => (
        <div key={g.id} className="border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {t("guardians.coGuardianParent")}
                </p>
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
            {permissionsList.map(({ key, label, locked }) => (
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
