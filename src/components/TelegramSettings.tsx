import { useState, useEffect } from "react";
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

export function TelegramSettings() {
  const { lang } = useI18n();
  const { user, selectedStudentId } = useAuth();
  const queryClient = useQueryClient();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [notificationChannel, setNotificationChannel] = useState("telegram");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isHT = lang === "HT";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("parent_settings")
        .select("telegram_bot_token, telegram_chat_id, whatsapp_number, whatsapp_enabled, notification_channel")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setBotToken((data as any).telegram_bot_token || "");
        setChatId((data as any).telegram_chat_id || "");
        setWhatsappNumber((data as any).whatsapp_number || "");
        setWhatsappEnabled((data as any).whatsapp_enabled || false);
        setNotificationChannel((data as any).notification_channel || "telegram");
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
      toast.error(isHT ? "Nimewo WhatsApp envalid. Fòma: +1XXXXXXXXXX" : "Invalid WhatsApp number. Format: +1XXXXXXXXXX");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("parent_settings")
        .upsert({
          user_id: user.id,
          telegram_bot_token: botToken || null,
          telegram_chat_id: chatId || null,
          whatsapp_number: whatsappNumber || null,
          whatsapp_enabled: whatsappEnabled,
          notification_channel: notificationChannel,
        } as any, { onConflict: "user_id" });
      if (error) throw error;
      toast.success(isHT ? "Paramèt notifikasyon sove!" : "Notification settings saved!");
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
      toast.success(isHT ? "Mesaj tès voye!" : "Test message sent!");
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-lg flex items-center gap-2">
        <Bell size={20} className="text-primary" />
        {isHT ? "Paramèt Notifikasyon" : "Notification Settings"}
      </h3>
      <p className="text-sm text-muted-foreground">
        {isHT
          ? "Konfigire kijan ou vle resevwa notifikasyon sou pwogrè elèv ou."
          : "Configure how you want to receive notifications about your students' progress."}
      </p>

      {/* Notification Channel Selector */}
      <div className="rounded-xl bg-card border p-4 space-y-3">
        <label className="text-sm font-medium">
          {isHT ? "Kanal Notifikasyon" : "Notification Channel"}
        </label>
        <Select value={notificationChannel} onValueChange={setNotificationChannel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="telegram">Telegram</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="both">{isHT ? "Tou de" : "Both"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Monitoring Toggle */}
      {selectedStudentId && (
        <div className="rounded-xl bg-card border p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Eye size={18} className="text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">{isHT ? "Ajan Siveyans Chak Èdtan" : "Hourly Monitoring Agent"}</p>
              <p className="text-xs text-muted-foreground">
                {isHT
                  ? "Otomatikman swiv pwogram ak voye alèt chak èdtan"
                  : "Automatically track schedule compliance and send lateness alerts every hour"}
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

      {/* Telegram Settings */}
      {(notificationChannel === "telegram" || notificationChannel === "both") && (
        <div className="space-y-3 rounded-xl bg-card border p-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Send size={14} /> Telegram
          </h4>
          <div>
            <label className="text-sm font-medium">{isHT ? "Token Bot" : "Bot Token"}</label>
            <Input
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              placeholder="123456789:ABCdefGhIjKlMnOpQrStUvWxYz"
              className="mt-1 font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{isHT ? "ID Chat" : "Chat ID"}</label>
            <Input
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              placeholder="696848510"
              className="mt-1 font-mono text-xs"
            />
          </div>
        </div>
      )}

      {/* WhatsApp Settings */}
      {(notificationChannel === "whatsapp" || notificationChannel === "both") && (
        <div className="space-y-3 rounded-xl bg-card border p-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare size={14} /> WhatsApp
          </h4>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {isHT ? "Aktive WhatsApp" : "Enable WhatsApp"}
            </label>
            <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
          </div>
          {whatsappEnabled && (
            <div>
              <label className="text-sm font-medium">
                {isHT ? "Nimewo WhatsApp" : "WhatsApp Number"}
              </label>
              <Input
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="+1XXXXXXXXXX"
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {isHT ? "Fòma E.164: +1XXXXXXXXXX" : "E.164 format: +1XXXXXXXXXX"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1 font-display">
          <Save size={14} className="mr-1" /> {saving ? (isHT ? "Ap chaje..." : "Loading...") : (isHT ? "Sove" : "Save")}
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={testing} className="font-display">
          <Send size={14} className="mr-1" /> {testing ? "..." : (isHT ? "Teste" : "Test")}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
        <p>✅ {isHT ? "Alèt badj jwenn" : "Badge earned alerts"}</p>
        <p>🚨 {isHT ? "Entèvansyon ijan" : "Urgent help intervention"}</p>
        <p>📊 {isHT ? "Rapò chak jou ak rezime chak semèn" : "Daily reports & weekly summaries"}</p>
        <p>📝 {isHT ? "Mizajou konpletman pis" : "Track completion updates"}</p>
        <p>👁️ {isHT ? "Siveyans chak èdtan (reta ak tcheke)" : "Hourly monitoring (lateness & check-ins)"}</p>
      </div>
    </div>
  );
}
