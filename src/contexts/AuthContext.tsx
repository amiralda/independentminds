import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { resolveProfileDisplayName, resolvePrimaryRole } from "@/lib/profile";

type Role = "student" | "parent";

interface Profile {
  displayName: string;
  role: Role;
  languagePref: string;
  onboardingComplete: boolean;
}

interface ProfileRow {
  display_name: string | null;
  language_pref: string | null;
  onboarding_complete: boolean | null;
}

// selectedStudentId is always a StudentRecord.id (students.id, uuid) --
// every per-student table keys on that uuid, never on the text student_id label.
interface StudentRecord {
  id: string;
  student_id: string | null;
  display_name: string;
  grade_level: number | null;
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

      // Fix Google OAuth display name
      if (_event === "SIGNED_IN" && session?.user) {
        const meta = session.user.user_metadata;
        const googleName = meta?.full_name || meta?.name;
        if (googleName) {
          void supabase
            .from("profiles")
            .update({ display_name: googleName })
            .eq("id", session.user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to update profile metadata", error);
            });
        }
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
      const [{ data, error: profileError }, { data: roleRows, error: rolesError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, language_pref, onboarding_complete")
          .eq("id", session.user.id)
          .maybeSingle<ProfileRow>(),
        // All rows, not .maybeSingle(): an account can hold several roles
        // (e.g. parent + admin), and maybeSingle() errors on >1 row, which
        // used to silently turn such accounts into "student".
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id),
      ]);

      if (cancelled) return;

      const role = resolvePrimaryRole((roleRows ?? []).map((r: { role: string }) => r.role)) as Role;
      // A failed roles read must not be mistaken for "no roles" (= student):
      // retry it the same way as a failed profile read.
      const error = profileError ?? rolesError;

      if (error) {
        console.error("Failed to load profile", error);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          if (!cancelled) await fetchProfile(retries - 1);
        } else {
          const fallbackName = resolveProfileDisplayName(null, session.user.user_metadata, session.user.email);
          setProfile({
            displayName: fallbackName,
            role,
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
          role,
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
          role,
          languagePref: "EN",
          onboardingComplete: false,
        });
        setLoading(false);
      }
    };

    void fetchProfile();
    return () => { cancelled = true; };
  }, [session?.user?.id, session?.user]);

  // Fetch students for parent users
  useEffect(() => {
    if (!session?.user || !profile) return;
    if (profile.role === "parent") {
      fetchStudents();
    }
  // `fetchStudents` is intentionally excluded to avoid refetch loops from function identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, session?.user, profile]);

  const fetchStudents = async () => {
    if (!session?.user) return;

    // Fetch students where user is primary parent
    const { data: ownStudents } = await supabase
      .from("students")
      .select("id, student_id, display_name, grade_level, parent_id")
      .eq("parent_id", session.user.id)
      .order("display_name");

    // Co-guardian student access was never implemented backend-side
    // (get_co_guardian_students RPC does not exist) — only own students for now.
    // via unknown: the generated types.ts predates students.grade_level
    // (the column exists in the database).
    const allStudents = (ownStudents || []) as unknown as StudentRecord[];

    setStudents(allStudents);
    if (allStudents.length === 0) return;
    // Keep the current selection only if it is one of these students' uuids;
    // otherwise (none yet, a deleted student, a legacy text label) re-pick.
    // Functional update: this runs async (e.g. refreshStudents() right after
    // adding a student), so the closed-over selectedStudentId may be stale.
    setSelectedStudentId(prev => {
      if (prev && allStudents.some(s => s.id === prev)) return prev;
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("im_selected_student") : null;
      const found = allStudents.find(s => s.id === saved);
      return found ? found.id : allStudents[0].id;
    });
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
