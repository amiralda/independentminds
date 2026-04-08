import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { LibraryPanel } from "@/components/LibraryPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { TodayBlocks } from "@/components/TodayBlocks";
import { CheckInForm } from "@/components/CheckInForm";
import { BadgesPanel } from "@/components/BadgesPanel";
import { TrophyRoom } from "@/components/TrophyRoom";
import { DadPanel } from "@/components/DadPanel";
import { StudentStatsBar } from "@/components/StudentStatsBar";
import { CategoryCards } from "@/components/CategoryCards";

import { AddStudentForm } from "@/components/AddStudentForm";
import { WelcomeModal } from "@/components/WelcomeModal";
import { useDailyBlocks, useRefreshBlocks } from "@/hooks/useDailyBlocks";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockReminderPopup } from "@/components/BlockReminderPopup";
import { BookOpen, CheckSquare, Trophy, LogOut, Award, Target, Library, Bot, UserCircle, Coins, HelpCircle, Shield, Mail, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.svg";
import { TutorChat } from "@/components/TutorChat";
import { ActivityFeed } from "@/components/ActivityFeed";
import { StudentProfileCard } from "@/components/StudentProfileCard";
import { RewardsPanel } from "@/components/RewardsPanel";
import { StudentHelpGuide } from "@/components/StudentHelpGuide";
import { BetaMissionBanner } from "@/components/beta/BetaMissionBanner";
import { BetaWelcomeModal } from "@/components/beta/BetaWelcomeModal";
import { useBetaTester } from "@/hooks/useBetaTester";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useRoleSwitcher } from "@/hooks/useRoleSwitcher";
import { EducatorDashboard } from "@/components/EducatorDashboard";

type StudentTab = "today" | "tracks" | "checkin" | "badges" | "trophies" | "library" | "tutor" | "profile" | "rewards";

const Index = () => {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { profile, selectedStudentId, viewingAsStudent, setViewingAsStudent, students, user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { isBetaTester } = useBetaTester();
  const { roles, activeRole, setActiveRole, hasMultipleRoles } = useRoleSwitcher();
  const [tab, setTab] = useState<StudentTab>("today");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [parentTab, setParentTab] = useState<string | undefined>(undefined);
  const [parentTabKey, setParentTabKey] = useState(0);

  const actualRole = profile?.role || "student";
  // Use role switcher's active role if user has multiple roles, otherwise use profile role
  const effectiveRole = hasMultipleRoles ? activeRole : actualRole;
  // When parent is viewing as student, treat role as "student" for rendering
  const role = (effectiveRole === "parent" && viewingAsStudent) ? "student" : effectiveRole;
  const studentId = role === "student" && actualRole === "parent" ? selectedStudentId : (actualRole === "student" ? (profile?.studentId || null) : selectedStudentId);
  const viewingStudent = viewingAsStudent ? students.find(s => s.student_id === selectedStudentId) : null;
  const displayName = viewingAsStudent && viewingStudent ? viewingStudent.display_name : (profile?.username || profile?.displayName || "User");

  const { data: blocks = [], isLoading } = useDailyBlocks(studentId);
  const refreshBlocks = useRefreshBlocks();

  // Unread inbox count for parents
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellRing, setBellRing] = useState(false);
  const [badgeBounce, setBadgeBounce] = useState(false);

  useEffect(() => {
    if (role !== "parent" || !profile) return;
    let prevCount = -1;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("inbox_messages")
        .select("*", { count: "exact", head: true })
        .eq("parent_id", user?.id)
        .eq("is_read", false);
      const newCount = count || 0;

      // Trigger animation + sound when count increases
      if (prevCount >= 0 && newCount > prevCount) {
        setBellRing(true);
        setBadgeBounce(true);
        // Play notification sound
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } catch {}
        setTimeout(() => setBellRing(false), 600);
        setTimeout(() => setBadgeBounce(false), 400);
      }
      prevCount = newCount;
      setUnreadCount(newCount);
    };
    fetchUnread();

    const channel = supabase
      .channel("inbox-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_messages" }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [role, profile]);

  // Show welcome modal for new parents
  const shouldShowWelcome = role === "parent" && profile && !profile.onboardingComplete;

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = displayName;
    const greeting = hour < 12 ? t("greeting.morning") : hour < 17 ? t("greeting.afternoon") : t("greeting.evening");
    return `${greeting}, ${name}!`;
  };

  const studentTabs: { key: StudentTab; icon: React.ElementType; label: string }[] = [
    { key: "today", icon: BookOpen, label: t("nav.today") },
    { key: "rewards", icon: Coins, label: t("inbox.rewards") },
    { key: "checkin", icon: CheckSquare, label: t("nav.checkin") },
    { key: "badges", icon: Trophy, label: t("nav.badges") },
    { key: "trophies", icon: Award, label: t("nav.trophies") },
    { key: "tutor", icon: Bot, label: "Mr A" },
    { key: "profile", icon: UserCircle, label: t("nav.settings") },
  ];

  return (
    <div className="min-h-screen bg-background" data-role={role}>
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        {t("a11y.skipToContent")}
      </a>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary shadow-md">
        <div className="container py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={logo} alt="Independent Minds" className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-xl font-bold text-primary-foreground leading-tight truncate">
                {t("app.title")}
              </h1>
              <p className="text-primary-foreground/70 text-[10px] sm:text-xs truncate">{t("app.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {role === "parent" && (
              <button
                onClick={() => { setParentTab("inbox"); setParentTabKey(k => k + 1); setTimeout(() => document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                className={`relative text-primary-foreground/70 hover:text-primary-foreground p-1.5 transition-transform ${bellRing ? "animate-bell-ring" : ""}`}
                title={lang === "HT" ? "Bwat Mesaj" : "Inbox"}
                aria-label={lang === "HT" ? "Bwat Mesaj" : "Inbox"}
              >
                <Mail size={18} />
                {unreadCount > 0 && (
                  <span className={`absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ${badgeBounce ? "animate-badge-bounce" : "animate-pulse-gentle"}`}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            )}
            {hasMultipleRoles && (
              <RoleSwitcher roles={roles} activeRole={activeRole} onSwitch={setActiveRole} />
            )}
            <LanguageToggle variant="dark" />
            {isAdmin && (
              <Link
                to="/admin"
                className="text-primary-foreground/70 hover:text-primary-foreground p-1.5"
                title="Admin Panel"
                aria-label="Admin Panel"
              >
                <Shield size={18} />
              </Link>
            )}
            {role === "student" && (
              <button
                onClick={() => setShowHelpGuide(true)}
                className="text-primary-foreground/70 hover:text-primary-foreground p-1.5"
                title={lang === "HT" ? "Gid" : "Help Guide"}
                aria-label={lang === "HT" ? "Gid Elèv" : "Student Help Guide"}
              >
                <HelpCircle size={18} />
              </button>
            )}
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
              className="text-primary-foreground/70 hover:text-primary-foreground p-1.5"
              title={t("action.signOut")}
              aria-label={t("action.signOut")}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Back to Parent banner when viewing as student */}
      {viewingAsStudent && actualRole === "parent" && (
        <div className="bg-accent border-b border-accent-foreground/10 sticky top-[44px] sm:top-[52px] z-40">
          <div className="container py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ArrowLeft size={16} className="text-accent-foreground flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-accent-foreground truncate">
                {lang === "HT"
                  ? `Ou konekte kòm ${viewingStudent?.display_name || "elèv"}`
                  : `Viewing as ${viewingStudent?.display_name || "student"}`}
              </span>
            </div>
            <button
              onClick={async () => {
                setViewingAsStudent(false);
                try {
                  await supabase.from("impersonation_logs" as any).insert({
                    parent_id: user?.id,
                    student_id: selectedStudentId,
                    action: "end",
                  } as any);
                } catch {}
              }}
            >
              {lang === "HT" ? "Retounen" : "Back to Parent"}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main id="main-content" className="container px-3 sm:px-4 pb-24">
        {isBetaTester && <BetaWelcomeModal />}
        {isBetaTester && <BetaMissionBanner />}
        {role === "student" ? (
          <>
            <BlockReminderPopup studentId={studentId} />
            <div className="py-4">
              <h2 className="font-display text-2xl font-bold">{getGreeting()}</h2>
            </div>

            {studentId && (
              <StudentStatsBar
                studentId={studentId}
                todayDone={blocks.filter(b => b.status === "Done").length}
                todayTotal={blocks.length}
              />
            )}

            {tab === "today" && (
              isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-6">
                  <TodayBlocks blocks={blocks} onRefresh={refreshBlocks} />
                  {studentId && <ActivityFeed studentId={studentId} />}
                </div>
              )
            )}
            {tab === "tracks" && <CategoryCards />}
            {tab === "checkin" && <CheckInForm studentId={studentId} onDone={refreshBlocks} />}
            {tab === "badges" && <BadgesPanel />}
            {tab === "trophies" && <TrophyRoom />}
            {tab === "rewards" && <RewardsPanel />}
            {tab === "tutor" && <TutorChat />}
            {tab === "profile" && studentId && <StudentProfileCard studentId={studentId} />}
          </>
        ) : role === "educator" ? (
          <div className="py-4">
            <EducatorDashboard />
          </div>
        ) : (
          <div className="py-4">
            <DadPanel onAddStudent={() => setShowAddStudent(true)} initialTab={parentTab as any} key={`dad-${parentTabKey}`} />
          </div>
        )}
      </main>

      {/* Bottom nav (student only) */}
      {role === "student" && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50 safe-area-bottom">
          <div className="container flex justify-around py-1.5 sm:py-2 px-1">
            {studentTabs.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-col items-center gap-0.5 py-1 px-1.5 sm:px-3 rounded-lg transition-all min-w-0 ${
                  tab === key ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={18} className="sm:w-5 sm:h-5" />
                <span className="text-[9px] sm:text-[10px] font-medium truncate max-w-[48px] sm:max-w-none">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Welcome Modal */}
      {shouldShowWelcome && (
        <WelcomeModal
          open={true}
          onClose={() => {}}
          onAddStudent={() => {
            setShowAddStudent(true);
          }}
        />
      )}

      {/* Add Student Dialog */}
      <AddStudentForm open={showAddStudent} onClose={() => setShowAddStudent(false)} />

      {/* Student Help Guide */}
      <StudentHelpGuide open={showHelpGuide} onClose={() => setShowHelpGuide(false)} />
    </div>
  );
};

export default Index;
