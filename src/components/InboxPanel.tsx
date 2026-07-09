import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Inbox, AlertTriangle, BookOpen, Trophy, Gift, CheckCheck, ChevronDown, Bell } from "lucide-react";

type MessageType = "sos" | "lesson_completed" | "streak_milestone" | "reward_redeemed" | "inactivity_alert" | "admin_broadcast";
type FilterTab = "all" | "unread" | "sos" | "lesson_completed" | "streak_milestone" | "reward_redeemed" | "admin_broadcast";

const TYPE_CONFIG: Record<MessageType, { icon: React.ElementType; color: string }> = {
  sos: { icon: AlertTriangle, color: "text-destructive" },
  lesson_completed: { icon: BookOpen, color: "text-primary" },
  streak_milestone: { icon: Trophy, color: "text-purple-500" },
  reward_redeemed: { icon: Gift, color: "text-amber-500" },
  inactivity_alert: { icon: AlertTriangle, color: "text-warning" },
  admin_broadcast: { icon: Bell, color: "text-blue-500" },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function InboxPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["inbox_messages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`inbox_realtime:${user.id}`)

      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "inbox_messages",
        filter: `parent_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["inbox_messages", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markAsRead = useCallback(async (messageId: string) => {
    await supabase
      .from("inbox_messages")
      .update({ is_read: true, read_at: new Date().toISOString() } as unknown)
      .eq("id", messageId);
    queryClient.invalidateQueries({ queryKey: ["inbox_messages", user?.id] });
  }, [user?.id, queryClient]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("inbox_messages")
      .update({ is_read: true, read_at: new Date().toISOString() } as unknown)
      .eq("parent_id", user.id)
      .eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["inbox_messages", user.id] });
  };

  // IntersectionObserver to mark messages read as they scroll into view
  const messageRefCallback = useCallback((node: HTMLDivElement | null, msg: unknown) => {
    if (!node || msg.is_read) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          markAsRead(msg.id);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
  }, [markAsRead]);

  const filtered = messages.filter((m: unknown) => {
    if (filter === "all") return true;
    if (filter === "unread") return !m.is_read;
    return m.message_type === filter;
  });

  const unreadCount = messages.filter((m: unknown) => !m.is_read).length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: t("inbox.all") },
    { key: "unread", label: t("inbox.unread") },
    { key: "sos", label: t("inbox.sos") },
    { key: "lesson_completed", label: t("inbox.lessons") },
    { key: "reward_redeemed", label: t("inbox.rewards") },
    { key: "streak_milestone", label: t("inbox.streaks") },
    { key: "admin_broadcast", label: t("inbox.announcements") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Inbox size={20} className="text-primary" />
          {t("inbox.title")}
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
            <CheckCheck size={14} className="mr-1" />
            {t("inbox.mark_all_read")}
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
            {key === "unread" && unreadCount > 0 && (
              <span className="ml-1 bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Messages */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("inbox.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg: unknown) => {
            const config = TYPE_CONFIG[msg.message_type as MessageType] || TYPE_CONFIG.lesson_completed;
            const Icon = config.icon;
            const isExpanded = expandedId === msg.id;

            return (
              <div
                key={msg.id}
                ref={(node) => messageRefCallback(node, msg)}
                onClick={() => {
                  setExpandedId(isExpanded ? null : msg.id);
                  if (!msg.is_read) markAsRead(msg.id);
                }}
                className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${
                  !msg.is_read ? "bg-primary/5 border-primary/20" : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!msg.is_read ? "font-bold" : "font-medium"}`}>
                        {msg.title}
                      </p>
                      {!msg.is_read && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground font-bold flex-shrink-0">
                          {t("inbox.new_badge")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.body}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {relativeTime(msg.created_at)}
                  </span>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t text-sm space-y-2">
                    <p>{msg.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Hook to get unread inbox count for badge display */
export function useUnreadCount() {
  const { user } = useAuth();
  const { data: count = 0 } = useQuery({
    queryKey: ["inbox_unread_count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("inbox_messages")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", user.id)
        .eq("is_read", false);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
  return count;
}
