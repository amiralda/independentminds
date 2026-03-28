import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { LogIn, UserPlus } from "lucide-react";
import logo from "@/assets/logo.svg";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function Login() {
  const { t, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error(lang === "HT" ? "Tanpri antre non konplè ou" : "Please enter your full name");
      return;
    }
    if (!adultConfirmed) {
      toast.error(lang === "HT" ? "Ou dwe konfime ke ou gen 18 an oswa plis" : "You must confirm you are 18 or older");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: fullName.trim(),
          adult_confirmed: true,
          adult_confirmed_at: new Date().toISOString(),
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.checkEmail"));
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error(error.message || "Google sign-in failed");
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <img src={logo} alt="Independent Minds" className="mx-auto mb-4 w-20 h-20 drop-shadow-lg" />
          <h1 className="font-display text-3xl font-bold text-primary-foreground">
            {t("app.title")}
          </h1>
          <p className="text-primary-foreground/70 text-sm mt-1 font-display">
            {t("app.subtitle")}
          </p>
        </div>

        {/* Language Toggle */}
        <div className="flex justify-center">
          <LanguageToggle variant="dark" />
        </div>

        {/* Auth Form */}
        <form
          onSubmit={isSignUp ? handleSignUp : handleLogin}
          className="space-y-4 rounded-2xl bg-card p-6 border shadow-xl"
        >
          {isSignUp && (
            <div>
              <label className="text-sm font-medium">{t("auth.fullName")}</label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Marie Joseph"
                required
                className="mt-1"
              />
            </div>
          )}
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
          <div>
            <label className="text-sm font-medium">{t("auth.password")}</label>
            <div className="mt-1">
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="text-sm font-medium">{t("auth.confirmPassword")}</label>
              <div className="mt-1">
                <PasswordInput value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordError(""); }} required />
              </div>
              {passwordError && (
                <p className="text-xs text-destructive mt-1">{passwordError}</p>
              )}
            </div>
          )}

          {/* Adult confirmation for sign-up */}
          {isSignUp && (
            <div className="flex items-start gap-2">
              <Checkbox
                id="adult-confirm"
                checked={adultConfirmed}
                onCheckedChange={(checked) => setAdultConfirmed(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="adult-confirm" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                {lang === "HT"
                  ? "Mwen konfime ke mwen gen 18 an oswa plis epi mwen se paran oswa gadyen legal elèv yo ke mwen pral jere sou platfòm sa a."
                  : "I confirm I am 18 years of age or older and am the parent or legal guardian of the students I will manage on this platform."}
              </label>
            </div>
          )}

          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
          )}
          <Button
            type="submit"
            className="w-full font-display bg-secondary text-secondary-foreground hover:bg-secondary/90"
            disabled={loading || (isSignUp && (!adultConfirmed || !fullName.trim()))}
          >
            {isSignUp ? (
              <><UserPlus size={16} className="mr-2" /> {loading ? t("auth.creatingAccount") : t("action.signUp")}</>
            ) : (
              <><LogIn size={16} className="mr-2" /> {loading ? t("auth.signingIn") : t("action.signIn")}</>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">{t("auth.orContinueWith")}</span>
            </div>
          </div>

          {/* Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full font-display"
            onClick={handleGoogleAuth}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>

          {/* Toggle Sign up / Sign in */}
          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? t("auth.hasAccount") : t("auth.noAccount")}{" "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setAdultConfirmed(false); setFullName(""); setConfirmPassword(""); setPasswordError(""); }}
              className="text-primary font-semibold hover:underline"
            >
              {isSignUp ? t("action.signIn") : t("action.signUp")}
            </button>
          </p>
        </form>

        {/* Footer with legal links */}
        <div className="text-center space-y-2">
          <div className="flex justify-center gap-4 text-xs">
            <Link to="/privacy" className="text-primary-foreground/60 hover:text-primary-foreground hover:underline">
              {lang === "HT" ? "Konfidansyalite" : "Privacy"}
            </Link>
            <Link to="/terms" className="text-primary-foreground/60 hover:text-primary-foreground hover:underline">
              {lang === "HT" ? "Kondisyon" : "Terms"}
            </Link>
          </div>
          <p className="text-xs text-primary-foreground/50 font-display">
            {t("app.version")} — Built with Love by KòdLabo
          </p>
        </div>
      </div>
      <style>{`[data-lovable-badge], .lovable-badge { display: none !important; }`}</style>
    </div>
  );
}
