import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  studentId: string;
}

const DEFAULT_POINTS_PER_TASK = 10;

// One family-wide number: parent_settings.points_per_task (default 10), read
// by the award_task_points trigger. RLS keeps parent_settings to its owner,
// so only the student's own parent can see and change it.
export function PointSettingsPanel({ studentId }: Props) {
  const { t } = useI18n();
  const { user, students } = useAuth();
  const queryClient = useQueryClient();
  const parentId = students.find((s) => s.id === studentId)?.parent_id ?? null;
  const isOwnParent = !!user && parentId === user.id;
  const [value, setValue] = useState<string | null>(null);

  const { data: current, isLoading } = useQuery({
    queryKey: ["points_per_task", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_settings")
        .select("points_per_task")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as { points_per_task: number } | null)?.points_per_task ?? DEFAULT_POINTS_PER_TASK;
    },
    enabled: isOwnParent,
  });

  // Fill the input once the saved value arrives; never show the default
  // first (a late load would overwrite what the parent already typed).
  useEffect(() => {
    if (current !== undefined) setValue(String(current));
  }, [current]);

  const save = useMutation({
    mutationFn: async (points: number) => {
      const { error } = await supabase
        .from("parent_settings")
        .upsert({ id: user!.id, points_per_task: points, updated_at: new Date().toISOString() } as never, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("action.saved"));
      queryClient.invalidateQueries({ queryKey: ["points_per_task"] });
    },
    onError: () => toast.error(t("blocks.saveFailed")),
  });

  const handleSave = () => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 1000) {
      toast.error(t("points.invalid"));
      return;
    }
    save.mutate(n);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Coins size={16} className="text-secondary" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("points.perTask")}</p>
      </div>
      {isOwnParent && (isLoading || value === null) ? (
        <Skeleton className="h-12 w-full rounded-lg" />
      ) : isOwnParent ? (
        <>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2.5">
            <Input
              type="number"
              min={0}
              max={1000}
              inputMode="numeric"
              aria-label={t("points.perTask")}
              className="w-24 h-9 text-center"
              value={value ?? ""}
              onChange={(e) => setValue(e.target.value)}
            />
            <Button size="sm" onClick={handleSave} disabled={save.isPending} className="font-display">
              <Save size={14} className="mr-1" /> {t("action.save")}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("points.perTaskHelp")}</p>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground">{t("points.perTaskParentOnly")}</p>
      )}
    </div>
  );
}
