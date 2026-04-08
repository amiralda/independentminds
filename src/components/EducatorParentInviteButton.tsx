import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

interface Props {
  studentId: string;
  studentName: string;
}

export function EducatorParentInviteButton({ studentId, studentName }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-educator-parent-invite",
        { body: { student_id: studentId, parent_email: email.trim() } }
      );
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Failed to send invite");
        return;
      }
      toast.success(data?.message || "Parent invite sent!");
      setOpen(false);
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs">
          <Mail size={14} className="mr-1" />
          {t("educators.inviteParent") || "Invite Parent"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("educators.inviteParentFor") || "Invite Parent for"} {studentName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("educators.inviteParentDesc") ||
              "The parent will receive full access to this student's dashboard, including rewards, settings, and all management features."}
          </p>
          <Input
            type="email"
            placeholder="parent@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <Button
            className="w-full bg-[#D85A30] hover:bg-[#C04E28]"
            disabled={!email.trim() || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 size={16} className="animate-spin mr-1" /> : <Mail size={16} className="mr-1" />}
            {sending
              ? (t("common.sending") || "Sending...")
              : (t("educators.sendInvite") || "Send Invitation")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
