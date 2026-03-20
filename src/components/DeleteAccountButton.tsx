import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function DeleteAccountButton() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "DELETE" || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success(lang === "HT" ? "Kont efase" : "Account deleted");
      navigate("/login");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <Trash2 size={20} className="text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-sm text-destructive">{t("profile.deleteAccount")}</p>
            <p className="text-xs text-muted-foreground">
              {lang === "HT"
                ? "Sa a pral efase tout done ou — elèv, orè, badj, ak tout lòt enfòmasyon."
                : "This will permanently delete all your data — students, schedules, badges, and everything."}
            </p>
          </div>
        </div>
        <Button size="sm" variant="destructive" onClick={() => setOpen(true)} className="w-full text-xs">
          <Trash2 size={14} className="mr-1" />
          {t("profile.deleteAccount")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive flex items-center gap-2">
              <AlertTriangle size={18} />
              {t("profile.deleteAccount")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {lang === "HT"
                ? "Aksyon sa a pa ka defèt. Tape DELETE pou konfime."
                : "This action cannot be undone. Type DELETE to confirm."}
            </p>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={t("profile.deleteAccountConfirm")}
              className="font-mono text-center"
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || loading}
                className="flex-1"
              >
                {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Trash2 size={14} className="mr-1" />}
                {lang === "HT" ? "Efase Kont Mwen" : "Delete My Account"}
              </Button>
              <Button variant="outline" onClick={() => { setOpen(false); setConfirmText(""); }}>
                {lang === "HT" ? "Anile" : "Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
