import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Bell, Mail, MessageSquare, Send, Clock, Users,
  Search, X, Check, AlertTriangle, Smartphone, ChevronDown
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ── Types ──
interface FilterState {
  roles: string[];
  betaStatus: string;
  taskProgress: string;
  languages: string[];
  activity: string;
  specificUsers: string[];
}

interface ChannelState {
  email: boolean;
  inapp: boolean;
  whatsapp: boolean;
  telegram: boolean;
}

interface UserProfile {
  id: string;
  display_name: string;
  role: string;
  language_pref: string;
  last_active_at: string | null;
  student_id: string | null;
}

interface SentNotification {
  id: string;
  title: string;
  body: string;
  channels: string[];
  recipient_count: number;
  status: string;
  sent_at: string;
  created_at: string;
}

const TEMPLATES = [
  {
    label: "Custom message",
    title: "",
    body: "",
  },
  {
    label: "Welcome back",
    title: "We miss you, {{name}}!",
    body: "It's been a while since you visited Independent Minds EDU. Your students are waiting for you — come back and check their progress!\n\nWe've made improvements since your last visit.",
  },
  {
    label: "Task reminder",
    title: "{{name}}, you have {{tasks_remaining}} tasks left!",
    body: "You're currently at {{level}} level with {{points}} points.\n\nComplete your remaining tasks to level up and earn Beta Champion status!",
  },
  {
    label: "You're almost there",
    title: "So close, {{name}}! 🎯",
    body: "You only have {{tasks_remaining}} task(s) left to become a Beta Champion!\n\nYou've earned {{points}} points so far. Finish your mission and claim your title!",
  },
  {
    label: "New feature announcement",
    title: "New on Independent Minds EDU! ✨",
    body: "Hi {{name}},\n\nWe've just launched a new feature that we think you'll love. Log in to check it out!\n\nYour feedback helps us build a better platform for diaspora families worldwide.",
  },
  {
    label: "Feedback request",
    title: "{{name}}, we'd love your feedback",
    body: "Hi {{name}},\n\nYour experience matters to us. Could you take a moment to share your thoughts on how we can improve Independent Minds EDU?\n\nAs a {{level}}-level user, your insights are especially valuable.",
  },
];

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "HT", label: "Haitian Creole" },
  { code: "FR", label: "French" },
  { code: "ES", label: "Spanish" },
  { code: "PT", label: "Portuguese" },
  { code: "AR", label: "Arabic" },
  { code: "ZH", label: "Chinese" },
  { code: "DE", label: "German" },
  { code: "JA", label: "Japanese" },
  { code: "RU", label: "Russian" },
];

const VARIABLE_CHIPS = [
  { var: "{{name}}", label: "Name" },
  { var: "{{tasks_remaining}}", label: "Tasks left" },
  { var: "{{level}}", label: "Level" },
  { var: "{{points}}", label: "Points" },
];

export default function AdminNotificationCenter() {
  const { session } = useAdminAuth();

  // ── Filters ──
  const [filters, setFilters] = useState<FilterState>({
    roles: [],
    betaStatus: "all",
    taskProgress: "any",
    languages: [],
    activity: "all",
    specificUsers: [],
  });

  // ── Channels ──
  const [channels, setChannels] = useState<ChannelState>({
    email: true,
    inapp: true,
    whatsapp: false,
    telegram: false,
  });

  // ── Message ──
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [template, setTemplate] = useState("Custom message");
  const [sendInLang, setSendInLang] = useState(true);

  // ── Schedule ──
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState("");

  // ── State ──
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [channelCounts, setChannelCounts] = useState({ email: 0, whatsapp: 0, telegram: 0 });
  const [history, setHistory] = useState<SentNotification[]>([]);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null);

  // ── Fetch profiles + history ──
  useEffect(() => {
    fetchProfiles();
    fetchHistory();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, role, language_pref, last_active_at, student_id") as any;
    if (data) setAllProfiles(data);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("admin_sent_notifications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20) as any;
    if (data) setHistory(data);
  };

  // ── Filter logic (client-side estimate) ──
  useEffect(() => {
    let filtered = [...allProfiles];

    if (filters.roles.length > 0) {
      filtered = filtered.filter((p) => {
        if (filters.roles.includes("parents") && p.role === "parent") return true;
        if (filters.roles.includes("admins")) return true; // approximate
        return false;
      });
    }

    if (filters.languages.length > 0) {
      filtered = filtered.filter((p) =>
        filters.languages.includes(p.language_pref?.toUpperCase() || "EN")
      );
    }

    if (filters.activity !== "all") {
      const now = Date.now();
      const day = 86400000;
      filtered = filtered.filter((p) => {
        const last = p.last_active_at ? new Date(p.last_active_at).getTime() : 0;
        const daysAgo = (now - last) / day;
        if (filters.activity === "active_7d") return daysAgo <= 7;
        if (filters.activity === "inactive_7d") return daysAgo > 7;
        if (filters.activity === "inactive_30d") return daysAgo > 30;
        if (filters.activity === "never") return !p.last_active_at;
        return true;
      });
    }

    if (filters.specificUsers.length > 0) {
      filtered = filtered.filter((p) => filters.specificUsers.includes(p.id));
    }

    setRecipientCount(filtered.length);
    if (filtered.length > 0 && !previewUser) {
      setPreviewUser(filtered[0]);
    }
  }, [filters, allProfiles]);

  // ── User search ──
  useEffect(() => {
    if (!userSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const q = userSearch.toLowerCase();
    setSearchResults(
      allProfiles
        .filter(
          (p) =>
            p.display_name.toLowerCase().includes(q) &&
            !filters.specificUsers.includes(p.id)
        )
        .slice(0, 5)
    );
  }, [userSearch, allProfiles, filters.specificUsers]);

  // ── Template selection ──
  const handleTemplate = (label: string) => {
    setTemplate(label);
    const t = TEMPLATES.find((t) => t.label === label);
    if (t) {
      setTitle(t.title);
      setBody(t.body);
    }
  };

  // ── Personalize preview ──
  const previewText = useCallback(
    (text: string) => {
      const name = previewUser?.display_name || "User";
      return text
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{tasks_remaining\}\}/g, "3")
        .replace(/\{\{level\}\}/g, "Tester")
        .replace(/\{\{points\}\}/g, "75");
    },
    [previewUser]
  );

  // ── Insert variable ──
  const insertVar = (v: string) => {
    setBody((prev) => prev + v);
  };

  // ── Toggle helpers ──
  const toggleRole = (role: string) => {
    setFilters((f) => ({
      ...f,
      roles: f.roles.includes(role)
        ? f.roles.filter((r) => r !== role)
        : [...f.roles, role],
    }));
  };

  const toggleLang = (code: string) => {
    setFilters((f) => ({
      ...f,
      languages: f.languages.includes(code)
        ? f.languages.filter((l) => l !== code)
        : [...f.languages, code],
    }));
  };

  const addSpecificUser = (user: UserProfile) => {
    setFilters((f) => ({
      ...f,
      specificUsers: [...f.specificUsers, user.id],
    }));
    setUserSearch("");
  };

  const removeSpecificUser = (userId: string) => {
    setFilters((f) => ({
      ...f,
      specificUsers: f.specificUsers.filter((id) => id !== userId),
    }));
  };

  // ── Send ──
  const activeChannels = Object.entries(channels)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const canSend = title.trim() && body.trim() && activeChannels.length > 0 && recipientCount > 0;

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/admin-notify`;
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          filters,
          channels: activeChannels,
          title,
          body,
          scheduled_for: scheduleMode === "later" ? scheduledDate : undefined,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Sent to ${result.sent} users successfully`);
        fetchHistory();
        setTitle("");
        setBody("");
      } else {
        toast.error(result.error || "Failed to send");
      }
    } catch (e) {
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  // ── Styles ──
  const cardCls = "bg-[hsl(220,20%,16%)] border border-white/10 rounded-xl p-5";
  const labelCls = "text-sm font-semibold text-white/80 mb-2 block";
  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50";
  const checkCls = (active: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
      active
        ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
        : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
    }`;

  // ── System alerts ──
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchSystemAlerts();
  }, []);

  const fetchSystemAlerts = async () => {
    const { data } = await supabase
      .from("admin_notifications" as any)
      .select("*")
      .in("notification_type", ["beta_error", "bug_report", "task_difficulty"])
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(20) as any;
    if (data) setSystemAlerts(data);
  };

  const markAlertRead = async (id: string) => {
    await supabase
      .from("admin_notifications" as any)
      .update({ is_read: true } as any)
      .eq("id", id);
    setSystemAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const alertIcon = (type: string) => {
    if (type === "beta_error") return <AlertTriangle size={16} className="text-red-400" />;
    if (type === "bug_report") return <AlertTriangle size={16} className="text-amber-400" />;
    return <AlertTriangle size={16} className="text-purple-400" />;
  };

  const alertBg = (type: string) => {
    if (type === "beta_error") return "border-red-500/30 bg-red-500/5";
    if (type === "bug_report") return "border-amber-500/30 bg-amber-500/5";
    return "border-purple-500/30 bg-purple-500/5";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bell className="text-teal-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Notification Center</h1>
      </div>

      {/* System Alerts Section */}
      {systemAlerts.length > 0 && (
        <div className={cardCls}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-400" />
            <h2 className="text-lg font-semibold text-white">System Alerts</h2>
            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-medium">
              {systemAlerts.length} unread
            </span>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {systemAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${alertBg(alert.notification_type)} flex items-start gap-3`}
              >
                <div className="mt-0.5">{alertIcon(alert.notification_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{alert.title}</p>
                  <p className="text-xs text-white/60 mt-0.5">{alert.body}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-white/30">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                    <button
                      onClick={() => markAlertRead(alert.id)}
                      className="text-[10px] text-teal-400 hover:text-teal-300"
                    >
                      Mark as read
                    </button>
                    <a
                      href="/admin/beta"
                      className="text-[10px] text-blue-400 hover:text-blue-300"
                    >
                      View in Beta Dashboard
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ════════ LEFT COLUMN ════════ */}
        <div className="lg:col-span-3 space-y-5">
          {/* ── Audience Filters ── */}
          <div className={cardCls}>
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Who receives this?</h2>
            </div>

            {/* Roles */}
            <label className={labelCls}>By role</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: "parents", label: "Parents" },
                { key: "beta_testers", label: "Beta testers" },
                { key: "co_guardians", label: "Co-guardians" },
                { key: "admins", label: "Admins" },
              ].map((r) => (
                <button
                  key={r.key}
                  className={checkCls(filters.roles.includes(r.key))}
                  onClick={() => toggleRole(r.key)}
                >
                  {filters.roles.includes(r.key) && <Check size={14} />}
                  {r.label}
                </button>
              ))}
            </div>

            {/* Beta status */}
            <label className={labelCls}>Beta status</label>
            <select
              className={inputCls + " mb-4"}
              value={filters.betaStatus}
              onChange={(e) => setFilters((f) => ({ ...f, betaStatus: e.target.value }))}
            >
              <option value="all">All users</option>
              <option value="beta_only">Beta testers only</option>
              <option value="non_beta">Non-beta users only</option>
            </select>

            {/* Task progress */}
            {(filters.roles.includes("beta_testers") || filters.betaStatus === "beta_only") && (
              <>
                <label className={labelCls}>Task progress</label>
                <select
                  className={inputCls + " mb-4"}
                  value={filters.taskProgress}
                  onChange={(e) => setFilters((f) => ({ ...f, taskProgress: e.target.value }))}
                >
                  <option value="any">Any progress</option>
                  <option value="never_started">0 tasks (never started)</option>
                  <option value="in_progress">1–3 tasks (in progress)</option>
                  <option value="completed">All tasks completed</option>
                </select>
              </>
            )}

            {/* Languages */}
            <label className={labelCls}>Language preference</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={checkCls(filters.languages.includes(l.code))}
                  onClick={() => toggleLang(l.code)}
                >
                  {filters.languages.includes(l.code) && <Check size={12} />}
                  {l.label}
                </button>
              ))}
            </div>

            {/* Activity */}
            <label className={labelCls}>Activity</label>
            <select
              className={inputCls + " mb-4"}
              value={filters.activity}
              onChange={(e) => setFilters((f) => ({ ...f, activity: e.target.value }))}
            >
              <option value="all">All users</option>
              <option value="active_7d">Active in last 7 days</option>
              <option value="inactive_7d">Inactive for 7+ days</option>
              <option value="inactive_30d">Inactive for 30+ days</option>
              <option value="never">Never logged in</option>
            </select>

            {/* Specific users */}
            <label className={labelCls}>Specific users</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                className={inputCls + " pl-8"}
                placeholder="Search by name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-[hsl(220,20%,18%)] border border-white/10 rounded-lg overflow-hidden">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                      onClick={() => addSpecificUser(u)}
                    >
                      {u.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filters.specificUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.specificUsers.map((uid) => {
                  const u = allProfiles.find((p) => p.id === uid);
                  return (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-teal-500/20 text-teal-300 text-xs rounded-full"
                    >
                      {u?.display_name || uid.slice(0, 8)}
                      <button onClick={() => removeSpecificUser(uid)}>
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Recipient count */}
            <div className="mt-4 py-3 px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-amber-300 text-sm font-medium">
                → {recipientCount} user{recipientCount !== 1 ? "s" : ""} will receive this notification
              </p>
            </div>
          </div>

          {/* ── Channels ── */}
          <div className={cardCls}>
            <div className="flex items-center gap-2 mb-4">
              <Send size={18} className="text-teal-400" />
              <h2 className="text-lg font-semibold text-white">How to send it?</h2>
            </div>

            <div className="space-y-3">
              {[
                { key: "email" as const, icon: Mail, label: "Email (Resend)", color: "text-blue-400" },
                { key: "inapp" as const, icon: Bell, label: "In-app notification", color: "text-teal-400" },
                { key: "whatsapp" as const, icon: Smartphone, label: "WhatsApp", color: "text-green-400" },
                { key: "telegram" as const, icon: Send, label: "Telegram", color: "text-sky-400" },
              ].map(({ key, icon: Icon, label, color }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={color} />
                    <span className="text-sm text-white/80">{label}</span>
                  </div>
                  <Switch
                    checked={channels[key]}
                    onCheckedChange={(v) => setChannels((c) => ({ ...c, [key]: v }))}
                  />
                </div>
              ))}
            </div>

            {activeChannels.length === 0 && (
              <div className="mt-3 flex items-center gap-2 text-amber-400 text-xs">
                <AlertTriangle size={14} />
                Select at least one channel
              </div>
            )}
          </div>

          {/* ── Message Composer ── */}
          <div className={cardCls}>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-purple-400" />
              <h2 className="text-lg font-semibold text-white">What to say?</h2>
            </div>

            {/* Template */}
            <label className={labelCls}>Template</label>
            <select
              className={inputCls + " mb-4"}
              value={template}
              onChange={(e) => handleTemplate(e.target.value)}
            >
              {TEMPLATES.map((t) => (
                <option key={t.label} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Title */}
            <label className={labelCls}>Subject / Title</label>
            <input
              className={inputCls + " mb-4"}
              placeholder="Notification title..."
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* Body */}
            <label className={labelCls}>Message body</label>
            <Textarea
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[120px] mb-2"
              placeholder="Write your message..."
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

            {/* Variable chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {VARIABLE_CHIPS.map((v) => (
                <button
                  key={v.var}
                  className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-md hover:bg-purple-500/30 transition-colors"
                  onClick={() => insertVar(v.var)}
                >
                  {v.label} <code className="ml-1 opacity-60">{v.var}</code>
                </button>
              ))}
            </div>

            {/* Language toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm text-white/70">Send in recipient's preferred language</span>
              <Switch checked={sendInLang} onCheckedChange={setSendInLang} />
            </div>
          </div>

          {/* ── Send Controls ── */}
          <div className={cardCls}>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === "now"}
                  onChange={() => setScheduleMode("now")}
                  className="accent-teal-500"
                />
                Send now
              </label>
              <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={scheduleMode === "later"}
                  onChange={() => setScheduleMode("later")}
                  className="accent-teal-500"
                />
                Schedule for later
              </label>
            </div>

            {scheduleMode === "later" && (
              <input
                type="datetime-local"
                className={inputCls + " mb-4"}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            )}

            <button
              disabled={!canSend || sending}
              onClick={() => setShowConfirm(true)}
              className="w-full py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <span className="animate-pulse">Sending...</span>
              ) : (
                <>
                  <Send size={16} />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </div>

        {/* ════════ RIGHT COLUMN ════════ */}
        <div className="lg:col-span-2 space-y-5">
          {/* ── Preview ── */}
          <div className={cardCls}>
            <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>

            {/* Preview user selector */}
            {allProfiles.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-white/50 mb-1 block">Preview as:</label>
                <select
                  className={inputCls}
                  value={previewUser?.id || ""}
                  onChange={(e) => {
                    const u = allProfiles.find((p) => p.id === e.target.value);
                    if (u) setPreviewUser(u);
                  }}
                >
                  {allProfiles.slice(0, 20).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Tabs defaultValue="email">
              <TabsList className="bg-white/5 border border-white/10 w-full">
                <TabsTrigger value="email" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  Email
                </TabsTrigger>
                <TabsTrigger value="inapp" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  In-app
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="telegram" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white">
                  Telegram
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <div className="bg-white rounded-lg overflow-hidden mt-3">
                  <div className="bg-[#1A365D] p-4 text-center">
                    <p className="text-white font-bold text-sm">Independent Minds EDU</p>
                  </div>
                  <div className="p-4">
                    <h3 className="text-[#1A365D] font-bold text-sm mb-2">
                      {previewText(title) || "Subject line"}
                    </h3>
                    <p className="text-gray-700 text-xs whitespace-pre-wrap leading-relaxed">
                      {previewText(body) || "Message body..."}
                    </p>
                    <div className="mt-4 text-center">
                      <span className="inline-block bg-[#1D9E75] text-white px-4 py-2 rounded-lg text-xs font-semibold">
                        Go to Dashboard →
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="inapp">
                <div className="mt-3 p-3 bg-blue-500/5 border-l-2 border-blue-400 rounded-r-lg">
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-blue-400" />
                    <p className="text-white text-sm font-medium">
                      {previewText(title) || "Title"}
                    </p>
                    <span className="w-2 h-2 bg-blue-400 rounded-full" />
                  </div>
                  <p className="text-white/60 text-xs mt-1">
                    {previewText(body)?.slice(0, 100) || "Body..."}
                  </p>
                  <p className="text-white/30 text-[10px] mt-1">Just now</p>
                </div>
              </TabsContent>

              <TabsContent value="whatsapp">
                <div className="mt-3 p-3 bg-green-900/20 rounded-lg border border-green-500/20">
                  <p className="text-green-300 text-xs font-mono whitespace-pre-wrap">
                    {previewText(title) + "\n\n" + previewText(body) || "Message..."}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="telegram">
                <div className="mt-3 p-3 bg-sky-900/20 rounded-lg border border-sky-500/20">
                  <p className="text-sky-300 text-xs whitespace-pre-wrap">
                    <strong>{previewText(title)}</strong>
                    {"\n\n"}
                    {previewText(body) || "Message..."}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── History ── */}
          <div className={cardCls}>
            <h2 className="text-lg font-semibold text-white mb-4">Recent notifications</h2>
            {history.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-6">No notifications sent yet</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {history.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{n.title}</p>
                        <p className="text-xs text-white/50 mt-0.5">
                          {n.recipient_count} recipient{n.recipient_count !== 1 ? "s" : ""}
                          {" · "}
                          {(n.channels || []).join(", ")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            n.status === "sent"
                              ? "bg-green-500/20 text-green-400"
                              : n.status === "failed"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {n.status}
                        </span>
                        <span className="text-[10px] text-white/30">
                          {n.sent_at
                            ? formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════ Confirmation Modal ════════ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[hsl(220,20%,16%)] border border-white/10 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Confirm Send</h3>
            <div className="space-y-2 text-sm text-white/70">
              <p>
                You are about to send to <span className="text-amber-300 font-semibold">{recipientCount}</span> user{recipientCount !== 1 ? "s" : ""}
              </p>
              <p>
                Channels: <span className="text-teal-300">{activeChannels.join(", ")}</span>
              </p>
              <p className="text-white/50 truncate">Message: {title.slice(0, 100)}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-500"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
