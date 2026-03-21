import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  LayoutDashboard, Users, TrendingUp, Gift, Activity,
  MessageSquare, Shield, LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.svg";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/admin/students", icon: Users, label: "Students" },
  { to: "/admin/engagement", icon: TrendingUp, label: "Engagement" },
  { to: "/admin/rewards", icon: Gift, label: "Rewards" },
  { to: "/admin/system", icon: Activity, label: "System" },
  { to: "/admin/messages", icon: MessageSquare, label: "Messages" },
  { to: "/admin/users", icon: Shield, label: "Users" },
];

export default function AdminLayout() {
  const { isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,20%,12%)]">
        <div className="animate-pulse text-white font-display text-xl">Loading admin…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-[hsl(220,20%,12%)]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[hsl(220,20%,14%)] border-r border-white/10 flex flex-col">
        <div className="p-5 flex items-center gap-3 border-b border-white/10">
          <img src={logo} alt="IM" className="w-8 h-8" />
          <span className="font-display font-bold text-white text-lg">Admin Panel</span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/8 hover:text-white/90"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/8 w-full transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
