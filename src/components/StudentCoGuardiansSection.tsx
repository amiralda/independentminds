import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Shield, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  studentId: string;
}

export function StudentCoGuardiansSection({ studentId }: Props) {
  const { t, lang } = useI18n();
  const { user } = useAuth();

  const { data: guardians = [] } = useQuery({
    queryKey: ["student_co_guardians_display", studentId],
    queryFn: async () => {
      const { data: coGuardians, error } = await supabase
        .from("co_guardians")
        .select("*")
        .eq("student_id", studentId);
      if (error) throw error;
      if (!coGuardians || coGuardians.length === 0) return [];

      // Fetch profile display names for each guardian
      const guardianIds = coGuardians.map((g: any) => g.guardian_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", guardianIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p.display_name])
      );

      return coGuardians.map((g: any) => ({
        ...g,
        display_name: profileMap.get(g.guardian_id) || t("guardians.coGuardian"),
      }));
    },
  });

  const permBadges = (g: any) => {
    const badges: { label: string; color: string }[] = [];
    if (g.is_full_access) {
      badges.push({ label: t("guardians.full_access"), color: "bg-primary/15 text-primary" });
      return badges;
    }
    badges.push({ label: t("guardians.view_progress"), color: "bg-muted text-muted-foreground" });
    if (g.can_receive_sos) badges.push({ label: t("guardians.sosShort"), color: "bg-destructive/15 text-destructive" });
    if (g.can_approve_rewards) badges.push({ label: t("nav.rewards"), color: "bg-amber-500/15 text-amber-700" });
    if (g.can_edit_lessons) badges.push({ label: t("guardians.lessons"), color: "bg-blue-500/15 text-blue-700" });
    return badges;
  };

  return (
    <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h4 className="font-display font-medium text-sm flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          {t("guardians.title")}
        </h4>
      </div>
      <div className="px-6 py-4">
        {guardians.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("guardians.no_guardians")}
            </p>
            <Link
              to="/parent/co-guardians"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <UserPlus size={12} />
              {t("guardians.add")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {guardians.map((g: any) => (
              <div key={g.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{g.display_name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {permBadges(g).map((b, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${b.color}`}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
