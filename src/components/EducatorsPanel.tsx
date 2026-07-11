import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, BookOpenCheck, Trash2, Mail, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { buildAppUrl } from "@/lib/siteUrl";

interface Props {
  studentId: string;
}

export function EducatorsPanel({ studentId }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const [invitePerms, setInvitePerms] = useState({
    can_edit_schedule: false,
    can_view_checkins: true,
    can_use_ai_tutor: false,
    can_view_reports: true,
    can_receive_sos: false,
  });

  const { data: educators = [] } = useQuery({
    queryKey: ["educator_students", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educator_students" as any)
        .select("*, educator:educators(*)")
        .eq("student_id", studentId);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["educator_invites", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educator_invites" as any)
        .select("*")
        .eq("student_id", studentId)
        .eq("status", "pending");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const sendInvite = async () => {
    if (!email.trim() || !user) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-educator-invite", {
        body: {
          student_id: studentId,
          invitee_email: email.trim().toLowerCase(),
          permissions: invitePerms,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || "Educator invite sent!");
      setEmail("");
      setShowPermissions(false);
      setInvitePerms({ can_edit_schedule: false, can_view_checkins: true, can_use_ai_tutor: false, can_view_reports: true, can_receive_sos: false });
      queryClient.invalidateQueries({ queryKey: ["educator_invites", studentId] });
    } catch (err: unknown) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const updatePermission = async (esId: string, field: string, value: boolean) => {
    const { error } = await supabase
      .from("educator_students" as any)
      .update({ [field]: value } as any)
      .eq("id", esId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["educator_students", studentId] });
  };

  const removeEducator = async (esId: string) => {
    const { error } = await supabase
      .from("educator_students" as any)
      .delete()
      .eq("id", esId);
    if (error) toast.error(error.message);
    else {
      toast.success("Educator removed");
      queryClient.invalidateQueries({ queryKey: ["educator_students", studentId] });
    }
  };

  const revokeInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from("educator_invites" as any)
      .update({ status: "revoked" } as any)
      .eq("id", inviteId);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["educator_invites", studentId] });
  };

  const permsList = [
    { key: "can_view_checkins", label: t("educators.viewCheckins") || "View Check-ins" },
    { key: "can_view_reports", label: t("educators.viewReports") || "View Reports" },
    { key: "can_edit_schedule", label: t("educators.editSchedule") || "Edit Schedule" },
    { key: "can_use_ai_tutor", label: t("educators.useAiTutor") || "Use AI Tutor" },
    { key: "can_receive_sos", label: t("educators.receiveSos") || "Receive SOS" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <BookOpenCheck size={20} className="text-[#D85A30]" />
          {t("educators.title") || "Educators"}
        </h3>
      </div>

      {/* Invite form */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder={t("educators.invitePlaceholder") || "Educator's email address"}
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
          </Button>
        </div>

        {showPermissions && email.trim() && (
          <div className="border rounded-xl p-4 space-y-3 bg-muted/30 animate-fade-in">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("educators.permissionsLabel") || "Educator Permissions"}
            </p>
            {permsList.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm">{label}</span>
                <Switch
                  checked={invitePerms[key as keyof typeof invitePerms]}
                  onCheckedChange={(val) => setInvitePerms(prev => ({ ...prev, [key]: val }))}
                />
              </div>
            ))}
          </div>
        )}

        <Button onClick={sendInvite} disabled={sending || !email.trim()} size="sm" className="w-full sm:w-auto bg-[#D85A30] hover:bg-[#C04E28]">
          <UserPlus size={16} className="mr-1" />
          {t("educators.sendInvite") || "Invite Educator"}
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
                  {t("guardians.pending") || "Pending"}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv.id)}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Active educators */}
      {educators.length === 0 && invites.length === 0 && (
        <p className="text-center text-muted-foreground py-6 text-sm">
          {t("educators.noEducators") || "No educators assigned yet"}
        </p>
      )}

      {educators.map((es: unknown) => (
        <div key={es.id} className="border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#D85A30]/10 flex items-center justify-center">
                <BookOpenCheck size={16} className="text-[#D85A30]" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("educators.educator") || "Educator"}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 font-medium">
                  {t("guardians.active") || "Active"}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeEducator(es.id)}>
              <Trash2 size={14} className="mr-1" />
              {t("action.remove") || "Remove"}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("guardians.permissions") || "Permissions"}
            </p>
            {permsList.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm">{label}</span>
                <Switch
                  checked={es[key] ?? false}
                  onCheckedChange={(val) => updatePermission(es.id, key, val)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
