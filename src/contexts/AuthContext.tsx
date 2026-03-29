import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "student" | "parent";

interface Profile {
  displayName: string;
  username: string;
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
  viewingAsStudent: boolean;
  setViewingAsStudent: (v: boolean) => void;
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
  viewingAsStudent: false,
  setViewingAsStudent: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [viewingAsStudent, setViewingAsStudent] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProfile(null);
        setStudents([]);
        setSelectedStudentId(null);
        setLoading(false);
      }
      // Update last_active_at on sign-in & fix Google OAuth display name
      if (_event === "SIGNED_IN" && session?.user) {
        const meta = session.user.user_metadata;
        const googleName = meta?.full_name || meta?.name;
        const updates: Record<string, any> = { last_active_at: new Date().toISOString() };
        // If display_name is generic "User..." pattern, update with Google name
        if (googleName) {
          updates.display_name = googleName;
          updates.username = googleName;
        }
        supabase
          .from("profiles")
          .update(updates as any)
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
        .select("display_name, username, role, student_id, language_pref, onboarding_complete")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setProfile({
          displayName: data.display_name,
          username: (data as any).username || data.display_name,
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

    // Fetch students where user is primary parent
    const { data: ownStudents } = await supabase
      .from("students")
      .select("student_id, display_name, grade_level, parent_id")
      .eq("parent_id", session.user.id)
      .order("display_name");

    // Fetch co-guardian students via security definer function (PII-filtered)
    const { data: coStudents } = await supabase
      .rpc('get_co_guardian_students', { _guardian_id: session.user.id } as any);

    let allStudents = (ownStudents || []) as StudentRecord[];

    if (coStudents && coStudents.length > 0) {
      const filtered = (coStudents as any[])
        .filter((cs: any) => !allStudents.some(s => s.student_id === cs.student_id))
        .map((cs: any) => ({
          student_id: cs.student_id,
          display_name: cs.display_name,
          grade_level: cs.grade_level,
          parent_id: cs.parent_id,
        }));
      allStudents = [...allStudents, ...filtered];
    }

    setStudents(allStudents);
    if (!selectedStudentId && allStudents.length > 0) {
      const saved = localStorage.getItem("im_selected_student");
      const found = allStudents.find(s => s.student_id === saved);
      setSelectedStudentId(found ? found.student_id : allStudents[0].student_id);
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
      viewingAsStudent, setViewingAsStudent,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
