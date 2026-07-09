import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const requestedNext = searchParams.get("next") || "/";
    const next = requestedNext.startsWith("/") ? requestedNext : "/";

    const finalizeAuth = async () => {
      const code = searchParams.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          toast.error("Google sign-in could not be completed. Please try again.");
          navigate("/login", { replace: true });
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        toast.error("Google sign-in could not be completed. Please try again.");
        navigate("/login", { replace: true });
        return;
      }

      if (!data.session) {
        toast.error("Google sign-in did not create a session. Please try again.");
        navigate("/login", { replace: true });
        return;
      }

      navigate(next, { replace: true });
    };

    void finalizeAuth();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Completing sign-in…
    </div>
  );
}
