import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LanguageToggle } from "@/components/LanguageToggle";
import { TodayBlocks } from "@/components/TodayBlocks";
import { CheckInForm } from "@/components/CheckInForm";
import { BadgesPanel } from "@/components/BadgesPanel";
import { LibraryPanel } from "@/components/LibraryPanel";
import { DadPanel } from "@/components/DadPanel";
import { TutorChat } from "@/components/TutorChat";
import { BookOpen, CheckSquare, Trophy, Library, ShieldCheck, GraduationCap, LogOut, Bot } from "lucide-react";

type Role = "student" | "parent";
type StudentTab = "today" | "checkin" | "badges" | "library" | "tutor";

const Index = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [tab, setTab] = useState<StudentTab>("today");
  const [blocks, setBlocks] = useState<any[]>([]);
  const [userName, setUserName] = useState("Chris");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const userRole = user.user_metadata?.role || "student";
        setRole(userRole as Role);
        setUserName(user.user_metadata?.display_name || "User");
      }
    });
  }, []);

  const fetchBlocks = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("daily_plan")
      .select("*")
      .eq("student_id", "CHRIS")
      .eq("plan_date", today)
      .order("block_order");
    if (data) setBlocks(data);
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greeting.morning");
    if (hour < 17) return t("greeting.afternoon");
    return t("greeting.evening");
  };

  const studentTabs: { key: StudentTab; icon: React.ElementType; label: string }[] = [
    { key: "today", icon: BookOpen, label: t("nav.today") },
    { key: "tutor", icon: Bot, label: t("nav.tutor") },
    { key: "checkin", icon: CheckSquare, label: t("nav.checkin") },
    { key: "badges", icon: Trophy, label: t("nav.badges") },
    { key: "library", icon: Library, label: t("nav.library") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary shadow-md">
        <div className="container py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap size={28} className="text-primary-foreground" />
            <div>
              <h1 className="font-display text-xl font-bold text-primary-foreground leading-tight">
                {t("app.title")}
              </h1>
              <p className="text-primary-foreground/70 text-xs">{t("app.subtitle")}</p>
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

      {/* Role switcher */}
      <div className="container py-2">
        <div className="flex gap-2 rounded-xl bg-muted p-1">
          <button
            onClick={() => setRole("student")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-display text-sm font-medium transition-all ${
              role === "student"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap size={16} /> {t("role.student")}
          </button>
          <button
            onClick={() => setRole("parent")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 font-display text-sm font-medium transition-all ${
              role === "parent"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck size={16} /> {t("role.parent")}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="container pb-24">
        {role === "student" ? (
          <>
            {/* Greeting */}
            <div className="py-4">
              <h2 className="font-display text-2xl font-bold">{getGreeting()}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {blocks.filter(b => b.status === "Done").length}/{blocks.length} blocks done today
              </p>
            </div>

            {/* Tab content */}
            {tab === "today" && <TodayBlocks blocks={blocks} onRefresh={fetchBlocks} />}
            {tab === "tutor" && <TutorChat />}
            {tab === "checkin" && <CheckInForm onDone={fetchBlocks} />}
            {tab === "badges" && <BadgesPanel />}
            {tab === "library" && <LibraryPanel />}
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
