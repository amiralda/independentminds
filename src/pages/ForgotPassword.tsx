import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import logo from "@/assets/logo.svg";
import { Mail, ArrowLeft } from "lucide-react";
import { buildAppUrl } from "@/lib/siteUrl";

export default function ForgotPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildAppUrl("/reset-password"),
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="Independent Minds" className="mx-auto mb-4 w-20 h-20 drop-shadow-lg" />
          <h1 className="font-display text-2xl font-bold text-primary-foreground">
            {t("auth.forgotPassword")}
          </h1>
          <p className="text-primary-foreground/70 text-sm mt-1">
            {t("auth.forgotPasswordDesc")}
          </p>
        </div>

        <div className="rounded-2xl bg-card p-6 border shadow-xl space-y-4">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/15 flex items-center justify-center">
                <Mail size={28} className="text-success" />
              </div>
              <h3 className="font-display text-lg font-bold">{t("auth.checkYourEmail")}</h3>
              <p className="text-sm text-muted-foreground">{t("auth.resetEmailSent")}</p>
              <Button variant="outline" onClick={() => navigate("/login")} className="w-full font-display">
                <ArrowLeft size={16} className="mr-2" /> {t("auth.backToLogin")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t("auth.email")}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full font-display bg-secondary text-secondary-foreground hover:bg-secondary/90" disabled={loading}>
                <Mail size={16} className="mr-2" />
                {loading ? t("auth.sending") : t("auth.sendResetLink")}
              </Button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
              >
                ← {t("auth.backToLogin")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
