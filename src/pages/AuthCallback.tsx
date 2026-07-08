import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const next = searchParams.get("next") || "/";

    const finalizeAuth = async () => {
      const { error } = await supabase.auth.getSession();
      if (error) {
        toast.error("Google sign-in could not be completed. Please try again.");
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
