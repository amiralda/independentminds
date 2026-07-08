import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { resolveProfileDisplayName } from "@/lib/profile";

type Role = "student" | "parent";

interface Profile {
  displayName: string;
  username: string;
  role: Role;
  studentId: string | null;
  languagePref: string;
  onboardingComplete: boolean;
}

interface ProfileRow {
  display_name: string | null;
  username: string | null;
  role: string | null;
  student_id: string | null;
  language_pref: string | null;
  onboarding_complete: boolean | null;
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
        return;
      }

      // Update last_active_at on sign-in & fix Google OAuth display name
      if (_event === "SIGNED_IN" && session?.user) {
        const meta = session.user.user_metadata;
        const googleName = meta?.full_name || meta?.name;
        const updates: Record<string, string> = { last_active_at: new Date().toISOString() };
        if (googleName) {
          updates.display_name = googleName;
          updates.username = googleName;
        }

        void supabase
          .from("profiles")
          .update(updates)
          .eq("id", session.user.id)
          .then(({ error }) => {
            if (error) console.error("Failed to update profile metadata", error);
          });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile when session changes — retry for new OAuth users
  // whose profile may not exist yet (handle_new_user trigger delay)
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;

    const fetchProfile = async (retries = 3) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, username, role, student_id, language_pref, onboarding_complete")
        .eq("id", session.user.id)
        .maybeSingle<ProfileRow>();

      if (cancelled) return;

      if (error) {
        console.error("Failed to load profile", error);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          if (!cancelled) await fetchProfile(retries - 1);
        } else {
          const fallbackName = resolveProfileDisplayName(null, session.user.user_metadata, session.user.email);
          setProfile({
            displayName: fallbackName,
            username: fallbackName,
            role: "student",
            studentId: null,
            languagePref: "EN",
            onboardingComplete: false,
          });
          setLoading(false);
        }
        return;
      }

      if (data) {
        const fallbackName = resolveProfileDisplayName(data.display_name, session.user.user_metadata, session.user.email);
        setProfile({
          displayName: fallbackName,
          username: resolveProfileDisplayName(data.username || data.display_name, session.user.user_metadata, session.user.email),
          role: (data.role as Role) || "student",
          studentId: data.student_id,
          languagePref: data.language_pref || "EN",
          onboardingComplete: data.onboarding_complete || false,
        });
        setLoading(false);
      } else if (retries > 0) {
        // Profile not ready yet — trigger may still be running (e.g. new Google OAuth user)
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (!cancelled) await fetchProfile(retries - 1);
      } else {
        const fallbackName = resolveProfileDisplayName(null, session.user.user_metadata, session.user.email);
        setProfile({
          displayName: fallbackName,
          username: fallbackName,
          role: "student",
          studentId: null,
          languagePref: "EN",
          onboardingComplete: false,
        });
        setLoading(false);
      }
    };

    void fetchProfile();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // Fetch students for parent users
  useEffect(() => {
    if (!session?.user || !profile) return;
    if (profile.role === "parent") {
      fetchStudents();
    } else if (profile.studentId) {
      setSelectedStudentId(profile.studentId);
      // Fetch student record via PII-filtered security definer function
      fetchStudentOwnRecord(profile.studentId);
    }
  }, [session?.user?.id, profile?.role]);

  const fetchStudentOwnRecord = async (studentId: string) => {
    const { data, error } = await supabase.rpc("get_my_student_record");
    if (error) {
      console.error("Failed to load student record", error);
      return;
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const rec = data[0] as Record<string, unknown>;
      setStudents([{
        student_id: String(rec.student_id ?? studentId),
        display_name: String(rec.display_name ?? "Student"),
        grade_level: Number(rec.grade_level ?? 0),
        parent_id: null,
      }]);
    }
  };

  const fetchStudents = async () => {
    if (!session?.user) return;

    // Fetch students where user is primary parent
    const { data: ownStudents } = await supabase
      .from("students")
      .select("student_id, display_name, grade_level, parent_id")
      .eq("parent_id", session.user.id)
      .order("display_name");

    // Fetch co-guardian students via security definer function (PII-filtered)
    const { data: coStudents, error: coStudentsError } = await supabase
      .rpc("get_co_guardian_students", { _guardian_id: session.user.id });

    if (coStudentsError) {
      console.error("Failed to load co-guardian students", coStudentsError);
    }

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
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("im_selected_student") : null;
      const found = allStudents.find(s => s.student_id === saved);
      setSelectedStudentId(found ? found.student_id : allStudents[0].student_id);
    }
  };

  const refreshStudents = () => {
    fetchStudents();
  };

  const updateProfile = async (updates: Partial<{ language_pref: string; onboarding_complete: boolean }>) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", session.user.id);

    if (error) {
      console.error("Failed to update profile", error);
      throw error;
    }

    if (updates.language_pref && profile) {
      setProfile({ ...profile, languagePref: updates.language_pref });
    }
    if (updates.onboarding_complete !== undefined && profile) {
      setProfile({ ...profile, onboardingComplete: updates.onboarding_complete });
    }
  };

  // Persist selected student
  useEffect(() => {
    if (selectedStudentId && typeof window !== "undefined") {
      window.localStorage.setItem("im_selected_student", selectedStudentId);
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
