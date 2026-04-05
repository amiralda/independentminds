import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/logo.svg";
import { KeyRound, ArrowLeft } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check both hash (implicit flow) and query params (PKCE flow)
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    if (hash.includes("type=recovery") || params.get("type") === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.passwordUpdated"));
      navigate("/");
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <img src={logo} alt="Independent Minds" className="mx-auto mb-4 w-20 h-20 drop-shadow-lg" />
          <div className="rounded-2xl bg-card p-6 border shadow-xl space-y-4">
            <h2 className="font-display text-xl font-bold">{t("auth.invalidResetLink")}</h2>
            <p className="text-sm text-muted-foreground">{t("auth.invalidResetDesc")}</p>
            <Button onClick={() => navigate("/login")} className="w-full font-display">
              <ArrowLeft size={16} className="mr-2" /> {t("auth.backToLogin")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="Independent Minds" className="mx-auto mb-4 w-20 h-20 drop-shadow-lg" />
          <h1 className="font-display text-2xl font-bold text-primary-foreground">
            {t("auth.setNewPassword")}
          </h1>
        </div>

        <form onSubmit={handleReset} className="space-y-4 rounded-2xl bg-card p-6 border shadow-xl">
          <div>
            <label className="text-sm font-medium">{t("auth.newPassword")}</label>
            <div className="mt-1">
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">{t("auth.confirmPassword")}</label>
            <div className="mt-1">
              <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" className="w-full font-display bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={loading}>
            <KeyRound size={16} className="mr-2" />
            {loading ? t("auth.updating") : t("auth.updatePassword")}
          </Button>
        </form>
      </div>
    </div>
  );
}
