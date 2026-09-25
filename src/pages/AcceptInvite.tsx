import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { readFunctionError } from "@/components/StudentLoginInvite";
import logo from "@/assets/logo.svg";

const ERROR_CODES = ["invalid_token", "used", "revoked", "expired", "email_mismatch", "own_invite", "student_account"];

export default function AcceptInvite() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { session, loading: authLoading, refreshStudents } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "needsAuth">("loading");
  const [errorKey, setErrorKey] = useState("coGuardian.err.generic");
  const acceptedRef = useRef(false);

  const acceptInvite = useCallback(async () => {
    if (!token || acceptedRef.current) return;
    acceptedRef.current = true;
    setStatus("loading");
    const { data, error } = await supabase.functions.invoke("accept-guardian-invite", { body: { token } });
    const failure = await readFunctionError(data, error);
    if (failure) {
      setErrorKey(failure.code && ERROR_CODES.includes(failure.code) ? `coGuardian.err.${failure.code}` : "coGuardian.err.generic");
      setStatus("error");
      acceptedRef.current = false;
      return;
    }
    setStatus("success");
    // The new family's students must be in the switcher before the dashboard opens.
    refreshStudents();
    setTimeout(() => navigate("/"), 1500);
  }, [token, navigate, refreshStudents]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setErrorKey("coGuardian.err.invalid_token");
      setStatus("error");
      return;
    }
    if (!session) {
      setStatus("needsAuth");
      return;
    }
    acceptInvite();
  }, [token, session, authLoading, acceptInvite]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={logo} alt="Independent Minds" className="w-16 h-16 mx-auto" />
        <h1 className="font-display text-2xl font-bold">{t("coGuardian.acceptTitle")}</h1>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-muted-foreground">{t("coGuardian.accepting")}</p>
          </div>
        )}

        {status === "needsAuth" && (
          <div className="space-y-4">
            <p className="text-muted-foreground">{t("coGuardian.needsAuth")}</p>
            <Link to={`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`}>
              <Button className="w-full">{t("coGuardian.signIn")}</Button>
            </Link>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4" data-testid="accept-invite-success">
            <CheckCircle size={48} className="mx-auto text-primary" />
            <p className="text-lg font-medium">{t("coGuardian.accepted")}</p>
            <p className="text-muted-foreground">{t("coGuardian.openingDashboard")}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4" data-testid="accept-invite-error">
            <XCircle size={48} className="mx-auto text-destructive" />
            <p className="text-lg font-medium">{t("coGuardian.acceptFailed")}</p>
            <p className="text-muted-foreground">{t(errorKey)}</p>
            <Link to="/">
              <Button variant="outline">{t("coGuardian.goDashboard")}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
