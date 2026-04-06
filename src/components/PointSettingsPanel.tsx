import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { usePointSettings, useSavePointSetting, ACTION_KEYS } from "@/hooks/usePointSettings";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Coins, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  studentId: string;
}

export function PointSettingsPanel({ studentId }: Props) {
  const { t } = useI18n();
  const { data: settings = [] } = usePointSettings(studentId);
  const saveSetting = useSavePointSetting();
  const [localValues, setLocalValues] = useState<Record<string, { points: number; enabled: boolean }>>({});

  // Initialize local values from settings + defaults
  useEffect(() => {
    const values: Record<string, { points: number; enabled: boolean }> = {};
    for (const action of ACTION_KEYS) {
      const existing = settings.find(s => s.action_key === action.key);
      values[action.key] = {
        points: existing?.points ?? action.default,
        enabled: existing?.enabled ?? true,
      };
    }
    setLocalValues(values);
  }, [settings]);

  const handleSave = (actionKey: string) => {
    const val = localValues[actionKey];
    if (!val) return;
    saveSetting.mutate(
      { student_id: studentId, action_key: actionKey, points: val.points, enabled: val.enabled },
      { onSuccess: () => toast.success(t("action.saved")) }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Coins size={16} className="text-secondary" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("points.perAction")}
        </p>
      </div>

      <div className="space-y-2">
        {ACTION_KEYS.map(action => {
          const val = localValues[action.key];
          if (!val) return null;
          return (
            <div
              key={action.key}
              className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2.5"
            >
              <Switch
                checked={val.enabled}
                onCheckedChange={(checked) =>
                  setLocalValues(prev => ({
                    ...prev,
                    [action.key]: { ...prev[action.key], enabled: checked },
                  }))
                }
                aria-label={`Toggle ${action.label}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {t(`points.${action.key}`) !== `points.${action.key}` ? t(`points.${action.key}`) : action.label}
                </p>
              </div>
              <Input
                type="number"
                min={0}
                max={500}
                className="w-20 h-8 text-center text-sm"
                value={val.points}
                onChange={(e) =>
                  setLocalValues(prev => ({
                    ...prev,
                    [action.key]: { ...prev[action.key], points: parseInt(e.target.value) || 0 },
                  }))
                }
              />
              <button
                onClick={() => handleSave(action.key)}
                className="text-muted-foreground hover:text-primary p-1 transition-colors"
                title="Save"
              >
                <Save size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        {t("points.customize")}
      </p>
    </div>
  );
}
