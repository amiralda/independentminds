import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Save, Send, Eye, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TelegramSetupWizard } from "@/components/TelegramSetupWizard";

export function TelegramSettings() {
  const { t } = useI18n();
  const { user, selectedStudentId } = useAuth();
  const queryClient = useQueryClient();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [notificationChannel, setNotificationChannel] = useState("telegram");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);

  

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("parent_settings")
        .select("telegram_chat_id, whatsapp_number, whatsapp_enabled, notification_channel")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setWhatsappNumber((data as any).whatsapp_number || "");
        setWhatsappEnabled((data as any).whatsapp_enabled || false);
        setNotificationChannel((data as any).notification_channel || "telegram");
        setTelegramLinked(!!(data as any).telegram_chat_id);
      }
      setLoaded(true);
    };
    load();
  }, [user]);

  const { data: monitoringEnabled, isLoading: monitoringLoading } = useQuery({
    queryKey: ["student_monitoring", selectedStudentId],
    enabled: !!selectedStudentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("monitoring_enabled")
        .eq("student_id", selectedStudentId!)
        .single();
      if (error) throw error;
      return (data as any)?.monitoring_enabled as boolean ?? true;
    },
  });

  const toggleMonitoring = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("students")
        .update({ monitoring_enabled: enabled } as any)
        .eq("student_id", selectedStudentId!);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["student_monitoring", selectedStudentId] });
      toast.success(enabled ? "Hourly monitoring enabled" : "Hourly monitoring disabled");
    },
    onError: () => toast.error("Failed to update monitoring setting"),
  });

  const validateWhatsApp = (num: string) => /^\+[1-9]\d{7,14}$/.test(num);

  const handleSave = async () => {
    if (!user) return;
    if (whatsappEnabled && whatsappNumber && !validateWhatsApp(whatsappNumber)) {
      toast.error(t("notifications.invalidWhatsapp"));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("parent_settings")
        .upsert({
          user_id: user.id,
          whatsapp_number: whatsappNumber || null,
          whatsapp_enabled: whatsappEnabled,
          notification_channel: notificationChannel,
        } as any, { onConflict: "user_id" });
      if (error) throw error;
      toast.success(t("notifications.saved"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke("parent-alerts", {
        body: { type: "test_connection" },
      });
      if (error) throw error;
      toast.success(t("notifications.testSent"));
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleWizardComplete = useCallback(() => {
    setTelegramLinked(true);
  }, []);

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-lg flex items-center gap-2">
        <Bell size={20} className="text-primary" />
        {t("notifications.settings")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {t("notifications.configureDesc")}
      </p>

      {/* Notification Channel Selector */}
      <div className="rounded-xl bg-card border p-4 space-y-3">
        <label className="text-sm font-medium">
          {t("notifications.channel")}
        </label>
        <Select value={notificationChannel} onValueChange={setNotificationChannel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="telegram">Telegram</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="both">{t("notifications.both")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Monitoring Toggle */}
      {selectedStudentId && (
        <div className="rounded-xl bg-card border p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Eye size={18} className="text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">{t("notifications.hourlyMonitor")}</p>
              <p className="text-xs text-muted-foreground">
                {t("notifications.hourlyMonitorDesc")}
              </p>
            </div>
          </div>
          <Switch
            checked={monitoringEnabled ?? true}
            onCheckedChange={(checked) => toggleMonitoring.mutate(checked)}
            disabled={monitoringLoading || toggleMonitoring.isPending}
          />
        </div>
      )}

      {/* Telegram Setup Wizard */}
      {(notificationChannel === "telegram" || notificationChannel === "both") && (
        <TelegramSetupWizard
          onComplete={handleWizardComplete}
          isAlreadyLinked={telegramLinked}
        />
      )}

      {/* WhatsApp Settings */}
      {(notificationChannel === "whatsapp" || notificationChannel === "both") && (
        <div className="space-y-3 rounded-xl bg-card border p-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare size={14} /> WhatsApp
          </h4>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {t("notifications.enableWhatsapp")}
            </label>
            <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
          </div>
          {whatsappEnabled && (
            <div>
              <label className="text-sm font-medium">
                {t("notifications.whatsappNumber")}
              </label>
              <Input
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="+1XXXXXXXXXX"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {t("notifications.e164Format")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1 font-display">
          <Save size={14} className="mr-1" /> {saving ? t("loading") : t("action.save")}
        </Button>
        {telegramLinked && (
          <Button variant="outline" onClick={handleTest} disabled={testing} className="font-display">
            <Send size={14} className="mr-1" /> {testing ? "..." : (t("notifications.test"))}
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
        <p>✅ {t("notifications.badgeAlerts")}</p>
        <p>🚨 {t("notifications.urgentHelp")}</p>
        <p>📊 {t("notifications.dailyReports")}</p>
        <p>📝 {t("notifications.trackUpdates")}</p>
        <p>👁️ {t("notifications.hourlyDesc")}</p>
      </div>
    </div>
  );
}
