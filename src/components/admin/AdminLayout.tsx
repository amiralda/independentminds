import { useState } from "react";
import { NavLink, Outlet, Navigate, Link } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  LayoutDashboard, Users, TrendingUp, Gift, Activity,
  MessageSquare, Shield, LogOut, Home, Menu, X, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.svg";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminNotifications } from "./AdminNotifications";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/admin/students", icon: Users, label: "Students" },
  { to: "/admin/engagement", icon: TrendingUp, label: "Engagement" },
  { to: "/admin/rewards", icon: Gift, label: "Rewards" },
  { to: "/admin/system", icon: Activity, label: "System" },
  { to: "/admin/messages", icon: MessageSquare, label: "Messages" },
  { to: "/admin/users", icon: Shield, label: "Users" },
  { to: "/admin/audit", icon: Eye, label: "Audit Logs" },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex-1 py-4 space-y-1 px-3">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
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
      <div className="p-3 border-t border-white/10 space-y-1">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/8 w-full transition-colors"
        >
          <Home size={18} />
          Parent Dashboard
        </Link>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/8 w-full transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function AdminLayout() {
  const { isAdmin, loading } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-[hsl(220,20%,14%)] border-r border-white/10 flex-col">
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="IM" className="w-8 h-8" />
            <span className="font-display font-bold text-white text-lg">Admin Panel</span>
          </div>
          <AdminNotifications />
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile Header + Sheet — visible only on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[hsl(220,20%,14%)] border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="IM" className="w-7 h-7" />
            <span className="font-display font-bold text-white text-base">Admin</span>
          </div>
          <div className="flex items-center gap-1">
            <AdminNotifications />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="text-white/70 hover:text-white p-1.5">
                <Menu size={22} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-[hsl(220,20%,14%)] border-white/10 flex flex-col">
              <div className="p-4 flex items-center gap-3 border-b border-white/10">
                <img src={logo} alt="IM" className="w-8 h-8" />
                <span className="font-display font-bold text-white text-lg">Admin Panel</span>
              </div>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="p-3 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
