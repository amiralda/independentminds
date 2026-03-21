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
  const { lang } = useI18n();
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
      toast.error(lang === "HT" ? "Tanpri antre imèl la" : "Please enter the email");
      return;
    }
    if (sourceEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      toast.error(lang === "HT" ? "Pa ka mèje ak menm kont" : "Cannot merge with the same account");
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
      toast.error(lang === "HT" ? "Echèk soumèt demann" : "Failed to submit request");
      return;
    }
    toast.success(lang === "HT" ? "Demann mèj soumèt! Admin ap revize." : "Merge request submitted! Admin will review.");
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
    if (lang === "HT") {
      return status === "approved" ? "Apwouve" : status === "rejected" ? "Rejte" : "An atant";
    }
    return status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitMerge size={16} className="text-primary" />
          <h3 className="font-display font-semibold text-sm">
            {lang === "HT" ? "Mèj Kont" : "Merge Accounts"}
          </h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs font-display">
              <Plus size={12} className="mr-1" /> {lang === "HT" ? "Demann" : "Request"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">
                {lang === "HT" ? "Demann Mèj Kont" : "Request Account Merge"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex gap-2">
                <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {lang === "HT"
                    ? "Sa a pral voye yon demann bay admin pou transfere tout done elèv soti nan ansyen kont ou ale nan kont aktyèl ou. Ansyen kont la ap dezaktive apre mèj la."
                    : "This will send a request to the admin to transfer all student data from your old account to your current one. The old account will be deactivated after merge."}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {lang === "HT" ? "Imèl ansyen kont" : "Old account email"}
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
                  {lang === "HT" ? "Imèl kont aktyèl" : "Current account email"}
                </label>
                <Input value={user?.email || ""} disabled className="mt-1 bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {lang === "HT" ? "Rezon (opsyonèl)" : "Reason (optional)"}
                </label>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={lang === "HT" ? "Eksplike poukisa ou bezwen mèj kont yo" : "Explain why you need to merge accounts"}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !sourceEmail.trim()} className="w-full font-display">
                <GitMerge size={14} className="mr-1" />
                {submitting
                  ? (lang === "HT" ? "Ap soumèt..." : "Submitting...")
                  : (lang === "HT" ? "Soumèt Demann" : "Submit Request")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-xs text-muted-foreground">
        {lang === "HT"
          ? "Si ou gen de kont, ou ka mande pou mèj yo. Admin ap revize epi apwouve."
          : "If you have duplicate accounts, request a merge. Admin will review and approve."}
      </p>

      {requests.length > 0 && (
        <div className="space-y-2">
          {requests.map((r: any) => (
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
