import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bell, Save, Send } from "lucide-react";

export function TelegramSettings() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("parent_settings")
        .select("telegram_bot_token, telegram_chat_id")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setBotToken((data as any).telegram_bot_token || "");
        setChatId((data as any).telegram_chat_id || "");
      }
      setLoaded(true);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("parent_settings")
        .upsert({
          user_id: user.id,
          telegram_bot_token: botToken || null,
          telegram_chat_id: chatId || null,
        } as any, { onConflict: "user_id" });
      if (error) throw error;
      toast.success(t("telegram.saved"));
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
      toast.success(t("telegram.testSuccess"));
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
        <Bell size={20} className="text-primary" /> {t("telegram.configure")}
      </h3>
      <p className="text-sm text-muted-foreground">
        Configure your personal Telegram bot to receive notifications about your students' progress.
      </p>

      <div className="space-y-3 rounded-xl bg-card border p-4">
        <div>
          <label className="text-sm font-medium">{t("telegram.botToken")}</label>
          <Input
            value={botToken}
            onChange={e => setBotToken(e.target.value)}
            placeholder="123456789:ABCdefGhIjKlMnOpQrStUvWxYz"
            className="mt-1 font-mono text-xs"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("telegram.chatId")}</label>
          <Input
            value={chatId}
            onChange={e => setChatId(e.target.value)}
            placeholder="696848510"
            className="mt-1 font-mono text-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1 font-display">
            <Save size={14} className="mr-1" /> {saving ? t("loading") : t("action.save")}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !botToken || !chatId} className="font-display">
            <Send size={14} className="mr-1" /> {testing ? "..." : t("telegram.test")}
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
        <p>✅ Badge earned alerts</p>
        <p>🚨 Urgent help intervention</p>
        <p>📊 Daily reports & weekly summaries</p>
        <p>📝 Track completion updates</p>
      </div>
    </div>
  );
}
