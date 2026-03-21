import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAdminAuth() {
  const { session, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      const { data } = await supabase.rpc("has_role" as any, {
        _user_id: session.user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
      setLoading(false);
    };
    checkAdmin();
  }, [session?.user?.id, authLoading]);

  return { isAdmin, loading: loading || authLoading, session };
}
