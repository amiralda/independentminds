import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Shield, UserPlus } from "lucide-react";

interface Props {
  studentId: string;
}

interface CoGuardian {
  id: string;
  email: string | null;
  display_name: string | null;
}

// Co-guardians are per family (co_guardians.parent_id), so every child of the
// family shows the same list. Managing it happens in the Co-guardians tab.
export function StudentCoGuardiansSection({ studentId }: Props) {
  const { t } = useI18n();
  const { user, students } = useAuth();
  const isOwner = !!user && students.some((s) => s.id === studentId && s.parent_id === user.id);

  const { data: guardians = [] } = useQuery({
    queryKey: ["student_co_guardians_display", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_co_guardians" as never);
      if (error) throw error;
      return (data || []) as unknown as CoGuardian[];
    },
    enabled: isOwner,
  });

  if (!isOwner) return null;

  const openManager = () =>
    window.dispatchEvent(new CustomEvent("beta-navigate-tab", { detail: { tab: "guardians" } }));

  return (
    <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h4 className="font-display font-medium text-sm flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          {t("coGuardian.title")}
        </h4>
        <button type="button" onClick={openManager} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <UserPlus size={12} />
          {t("coGuardian.manage")}
        </button>
      </div>
      <div className="px-6 py-4">
        {guardians.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">{t("coGuardian.none")}</p>
        ) : (
          <div className="space-y-2">
            {guardians.map((g) => (
              <div key={g.id} className="min-w-0">
                <p className="text-sm font-medium truncate">{g.display_name || g.email}</p>
                <p className="text-[11px] text-muted-foreground truncate">{g.email} · {t("coGuardian.sameAccess")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
