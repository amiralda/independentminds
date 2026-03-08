import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { TodayBlocks } from "@/components/TodayBlocks";
import { CheckInForm } from "@/components/CheckInForm";
import { BadgesPanel } from "@/components/BadgesPanel";
import { TrophyRoom } from "@/components/TrophyRoom";
import { LibraryPanel } from "@/components/LibraryPanel";
import { DadPanel } from "@/components/DadPanel";
import { StudentStatsBar } from "@/components/StudentStatsBar";
import { CategoryCards } from "@/components/CategoryCards";
import { useDailyBlocks, useRefreshBlocks } from "@/hooks/useDailyBlocks";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, CheckSquare, Trophy, Library, LogOut, Award, Target } from "lucide-react";
import logo from "@/assets/logo.svg";
import { useState } from "react";

type StudentTab = "today" | "tracks" | "checkin" | "badges" | "trophies" | "library";

const Index = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [tab, setTab] = useState<StudentTab>("today");

  const role = profile?.role || "student";
  const studentId = profile?.studentId || null;
  const displayName = profile?.displayName || "User";

  const { data: blocks = [], isLoading } = useDailyBlocks(studentId);
  const refreshBlocks = useRefreshBlocks();

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = displayName;
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  const studentTabs: { key: StudentTab; icon: React.ElementType; label: string }[] = [
    { key: "today", icon: BookOpen, label: t("nav.today") },
    { key: "tracks", icon: Target, label: "Tracks" },
    { key: "checkin", icon: CheckSquare, label: t("nav.checkin") },
    { key: "badges", icon: Trophy, label: t("nav.badges") },
    { key: "trophies", icon: Award, label: "Trophies" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary shadow-md">
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Independent Minds" className="w-8 h-8" />
            <div>
              <h1 className="font-display text-xl font-bold text-primary-foreground leading-tight">
                Independent Minds
              </h1>
              <p className="text-primary-foreground/70 text-xs">Learn Smart. Grow Every Day.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
              className="text-primary-foreground/70 hover:text-primary-foreground p-1"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container pb-24">
        {role === "student" ? (
          <>
            {/* Greeting + Stats */}
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

            {/* Tab content */}
            {tab === "today" && (
              isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : (
                <TodayBlocks blocks={blocks} onRefresh={refreshBlocks} />
              )
            )}
            {tab === "tracks" && <CategoryCards />}
            {tab === "checkin" && <CheckInForm studentId={studentId} onDone={refreshBlocks} />}
            {tab === "badges" && <BadgesPanel />}
            {tab === "trophies" && <TrophyRoom />}
          </>
        ) : (
          <div className="py-4">
            <DadPanel />
          </div>
        )}
      </main>

      {/* Bottom nav (student only) */}
      {role === "student" && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
          <div className="container flex justify-around py-2">
            {studentTabs.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
                  tab === key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Index;
