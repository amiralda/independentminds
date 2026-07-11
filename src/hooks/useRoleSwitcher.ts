import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type ActiveRole = "parent" | "student" | "educator";

interface RoleSwitcherState {
  roles: ActiveRole[];
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
  hasMultipleRoles: boolean;
  loading: boolean;
}

export function useRoleSwitcher(): RoleSwitcherState {
  const { profile, user, session } = useAuth();
  const [roles, setRoles] = useState<ActiveRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<ActiveRole>("parent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      const detectedRoles: ActiveRole[] = [];

      // Profile role is always one
      if (profile.role === "parent") detectedRoles.push("parent");
      if (profile.role === "student") detectedRoles.push("student");

      // Check user_roles for additional roles
      const { data: userRoles } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id);

      if (userRoles) {
        for (const r of userRoles as any[]) {
          if (r.role === "parent" && !detectedRoles.includes("parent")) {
            detectedRoles.push("parent");
          }
          if (r.role === "educator" && !detectedRoles.includes("educator")) {
            detectedRoles.push("educator");
          }
        }
      }

      // Check if user is an educator
      const { data: educatorRow } = await supabase
        .from("educators" as any)
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (educatorRow && (educatorRow as any[]).length > 0 && !detectedRoles.includes("educator")) {
        detectedRoles.push("educator");
      }

      setRoles(detectedRoles.length > 0 ? detectedRoles : [profile.role as ActiveRole]);

      // Restore saved role
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("im_active_role") as ActiveRole | null : null;
      if (saved && detectedRoles.includes(saved)) {
        setActiveRoleState(saved);
      } else {
        setActiveRoleState(detectedRoles[0] || (profile.role as ActiveRole));
      }

      setLoading(false);
    };

    fetchRoles();
  }, [user, profile]);

  const setActiveRole = useCallback((role: ActiveRole) => {
    setActiveRoleState(role);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("im_active_role", role);
    }
  }, []);

  return {
    roles,
    activeRole,
    setActiveRole,
    hasMultipleRoles: roles.length > 1,
    loading,
  };
}
