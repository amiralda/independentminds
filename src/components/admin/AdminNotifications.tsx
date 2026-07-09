import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Eye, CheckCheck, List, BarChart3, Users, BookOpen, Shield, Gift, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  is_read: boolean;
  metadata: unknown;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  impersonation: { label: "Impersonation", icon: Shield, color: "text-amber-400" },
  student_created: { label: "New Students", icon: Users, color: "text-emerald-400" },
  coguardian_accepted: { label: "Co-Guardians", icon: Users, color: "text-blue-400" },
  sos_checkin: { label: "SOS Check-Ins", icon: AlertTriangle, color: "text-red-400" },
  reward_redeemed: { label: "Rewards Redeemed", icon: Gift, color: "text-purple-400" },
  beta_error: { label: "Beta Errors", icon: AlertTriangle, color: "text-red-500" },
  bug_report: { label: "Bug Reports", icon: AlertTriangle, color: "text-amber-500" },
  task_difficulty: { label: "Task Difficulty", icon: AlertTriangle, color: "text-purple-500" },
};

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "summary">("list");

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("admin_notifications" as unknown)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) as unknown;
    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel("admin-notifs")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "admin_notifications",
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const grouped = useMemo(() => {
    const map: Record<string, { total: number; unread: number }> = {};
    for (const n of notifications) {
      if (!map[n.notification_type]) {
        map[n.notification_type] = { total: 0, unread: 0 };
      }
      map[n.notification_type].total++;
      if (!n.is_read) map[n.notification_type].unread++;
    }
    return map;
  }, [notifications]);

  const markRead = async (id: string) => {
    await supabase
      .from("admin_notifications" as unknown)
      .update({ is_read: true } as unknown)
      .eq("id", id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("admin_notifications" as unknown)
      .update({ is_read: true } as unknown)
      .in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getTypeIcon = (type: string) => {
    const cfg = TYPE_CONFIG[type];
    if (!cfg) return <Eye size={14} className="text-white/30" />;
    const Icon = cfg.icon;
    return <Icon size={14} className={cfg.color} />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative text-white/70 hover:text-white p-1.5 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-[hsl(220,20%,16%)] border-white/10"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-white text-sm">Notifications</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(view === "list" ? "summary" : "list")}
              className="text-white/50 hover:text-white/80 transition-colors"
              aria-label={view === "list" ? "Show summary" : "Show list"}
            >
              {view === "list" ? <BarChart3 size={15} /> : <List size={15} />}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {view === "summary" ? (
            /* Summary View */
            Object.keys(grouped).length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">
                No notifications
              </p>
            ) : (
              <div className="p-2 space-y-1">
                {Object.entries(grouped)
                  .sort((a, b) => b[1].unread - a[1].unread)
                  .map(([type, counts]) => {
                    const cfg = TYPE_CONFIG[type];
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div className={`p-1.5 rounded-full ${
                          counts.unread > 0 ? "bg-white/10" : "bg-white/5"
                        }`}>
                          {getTypeIcon(type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            counts.unread > 0 ? "text-white" : "text-white/50"
                          }`}>
                            {cfg?.label || type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {counts.unread > 0 && (
                            <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-medium">
                              {counts.unread} new
                            </span>
                          )}
                          <span className="text-white/30">{counts.total}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )
          ) : (
            /* List View */
            notifications.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">
                No notifications
              </p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                    !n.is_read ? "bg-blue-500/5" : ""
                  }`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-full ${
                      !n.is_read ? "bg-amber-500/20" : "bg-white/5"
                    }`}>
                      {getTypeIcon(n.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${
                          !n.is_read ? "text-white" : "text-white/60"
                        }`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-white/30 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
