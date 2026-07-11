import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GitMerge, Plus, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function AccountMergeRequest() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceEmail, setSourceEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: requests = [] } = useQuery({
    queryKey: ["merge_requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merge_requests" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
  });

  const handleSubmit = async () => {
    if (!user?.email || !sourceEmail.trim()) {
      toast.error(t("merge.enterEmail"));
      return;
    }
    if (sourceEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      toast.error(t("merge.cannotSame"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("merge_requests" as any).insert({
      requester_id: user.id,
      source_email: sourceEmail.trim().toLowerCase(),
      target_email: user.email,
      reason: reason.trim() || null,
      status: "pending",
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error(t("merge.submitFailed"));
      return;
    }
    toast.success(t("merge.submitted"));
    setDialogOpen(false);
    setSourceEmail("");
    setReason("");
    qc.invalidateQueries({ queryKey: ["merge_requests"] });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle size={14} className="text-success" />;
      case "rejected": return <XCircle size={14} className="text-destructive" />;
      default: return <Clock size={14} className="text-warning" />;
    }
  };

  const getStatusLabel = (status: string) => {
    return status === "approved" ? t("merge.approved") : status === "rejected" ? t("merge.rejected") : t("merge.pending");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitMerge size={16} className="text-primary" />
          <h3 className="font-display font-semibold text-sm">
            {t("merge.title")}
          </h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs font-display">
              <Plus size={12} className="mr-1" /> {t("merge.request")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">
                {t("merge.requestTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex gap-2">
                <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {t("merge.warning")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("merge.oldEmail")}
                </label>
                <Input
                  type="email"
                  value={sourceEmail}
                  onChange={e => setSourceEmail(e.target.value)}
                  placeholder="old.email@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("merge.currentEmail")}
                </label>
                <Input value={user?.email || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("merge.reasonOptional")}
                </label>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t("merge.reasonPlaceholder")}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !sourceEmail.trim()} className="w-full font-display">
                <GitMerge size={14} className="mr-1" />
                {submitting
                  ? t("merge.submitting")
                  : t("merge.submitRequest")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("merge.duplicateDesc")}
      </p>

      {requests.length > 0 && (
        <div className="space-y-2">
          {requests.map((r: unknown) => (
            <div key={r.id} className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2">
              {getStatusIcon(r.status)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {r.source_email} → {r.target_email}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                r.status === "approved" ? "bg-success/20 text-success" :
                r.status === "rejected" ? "bg-destructive/20 text-destructive" :
                "bg-warning/20 text-warning"
              }`}>
                {getStatusLabel(r.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
