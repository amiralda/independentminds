import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/logo.svg";
import { KeyRound, ArrowLeft } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { isPasswordLongEnough } from "@/lib/password";

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [searchParams] = useSearchParams();
  // Where to go after the password is set (e.g. /accept-invite?token=...).
  // Same-origin paths only: "/x" yes, "//evil.com" or "https://..." no.
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  useEffect(() => {
    // Recovery links and account invites (student logins, co-guardians) both
    // land here to set a password. Check both hash (implicit flow) and query
    // params (PKCE flow).
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const linkType = params.get("type");
    if (/type=(recovery|invite)/.test(hash) || linkType === "recovery" || linkType === "invite") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
      // An invite link signs the user in (SIGNED_IN, not PASSWORD_RECOVERY)
      // and supabase-js may already have cleared the hash; the `next` param
      // only comes from our own invite links.
      if (session && next) setIsRecovery(true);
    });

    return () => subscription.unsubscribe();
  }, [next]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }
    if (!isPasswordLongEnough(password)) {
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
      navigate(next || "/");
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
