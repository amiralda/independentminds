import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "student" | "parent";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { displayName: string; role: Role; studentId: string | null } | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile when session changes
  useEffect(() => {
    if (!session?.user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, role, student_id")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setProfile({
          displayName: data.display_name,
          role: (data.role as Role) || "student",
          studentId: data.student_id,
        });
      } else {
        // Fallback to user_metadata
        setProfile({
          displayName: session.user.user_metadata?.display_name || "User",
          role: (session.user.user_metadata?.role as Role) || "student",
          studentId: session.user.user_metadata?.student_id || null,
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [session?.user?.id]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
