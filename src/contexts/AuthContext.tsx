import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "student" | "parent";

interface Profile {
  displayName: string;
  role: Role;
  studentId: string | null;
  languagePref: string;
  onboardingComplete: boolean;
}

interface StudentRecord {
  student_id: string;
  display_name: string;
  grade_level: number;
  parent_id: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  students: StudentRecord[];
  selectedStudentId: string | null;
  setSelectedStudentId: (id: string | null) => void;
  refreshStudents: () => void;
  updateProfile: (updates: Partial<{ language_pref: string; onboarding_complete: boolean }>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  students: [],
  selectedStudentId: null,
  setSelectedStudentId: () => {},
  refreshStudents: () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProfile(null);
        setStudents([]);
        setSelectedStudentId(null);
        setLoading(false);
      }
      // Update last_active_at on sign-in
      if (_event === "SIGNED_IN" && session?.user) {
        supabase
          .from("profiles")
          .update({ last_active_at: new Date().toISOString() } as any)
          .eq("id", session.user.id)
          .then(() => {});
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
        .select("display_name, role, student_id, language_pref, onboarding_complete")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setProfile({
          displayName: data.display_name,
          role: (data.role as Role) || "student",
          studentId: data.student_id,
          languagePref: (data as any).language_pref || "EN",
          onboardingComplete: (data as any).onboarding_complete || false,
        });
      } else {
        // Profile not ready yet (trigger may be delayed) — sign out to prevent
        // untrusted user_metadata from being used for role/studentId.
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(false);
    };

    fetchProfile();
  }, [session?.user?.id]);

  // Fetch students for parent users
  useEffect(() => {
    if (!session?.user || !profile) return;
    if (profile.role === "parent") {
      fetchStudents();
    } else if (profile.studentId) {
      setSelectedStudentId(profile.studentId);
    }
  }, [session?.user?.id, profile?.role]);

  const fetchStudents = async () => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("students")
      .select("student_id, display_name, grade_level, parent_id")
      .eq("parent_id", session.user.id)
      .order("display_name");
    if (data) {
      setStudents(data as StudentRecord[]);
      // Auto-select first student if none selected
      if (!selectedStudentId && data.length > 0) {
        const saved = localStorage.getItem("im_selected_student");
        const found = data.find(s => s.student_id === saved);
        setSelectedStudentId(found ? found.student_id : data[0].student_id);
      }
    }
  };

  const refreshStudents = () => {
    fetchStudents();
  };

  const updateProfile = async (updates: Partial<{ language_pref: string; onboarding_complete: boolean }>) => {
    if (!session?.user) return;
    await supabase
      .from("profiles")
      .update(updates as any)
      .eq("id", session.user.id);
    
    if (updates.language_pref && profile) {
      setProfile({ ...profile, languagePref: updates.language_pref });
    }
    if (updates.onboarding_complete !== undefined && profile) {
      setProfile({ ...profile, onboardingComplete: updates.onboarding_complete });
    }
  };

  // Persist selected student
  useEffect(() => {
    if (selectedStudentId) {
      localStorage.setItem("im_selected_student", selectedStudentId);
    }
  }, [selectedStudentId]);

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, profile, loading,
      students, selectedStudentId, setSelectedStudentId,
      refreshStudents, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
