import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TodayBlocks } from "@/components/TodayBlocks";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CheckInForm } from "@/components/CheckInForm";
import { TutorChat } from "@/components/TutorChat";
import { ReportsPanel } from "@/components/ReportsPanel";
import { EducatorGroupsPanel } from "@/components/EducatorGroupsPanel";
import { EducatorParentInviteButton } from "@/components/EducatorParentInviteButton";
import { useDailyBlocks, useRefreshBlocks } from "@/hooks/useDailyBlocks";
import { BookOpen, CheckSquare, BarChart3, Bot, GraduationCap, Activity, Users } from "lucide-react";

type EducatorTab = "schedule" | "activity" | "checkins" | "reports" | "tutor" | "groups";

interface EducatorStudent {
  id: string;
  student_id: string;
  can_edit_schedule: boolean;
  can_view_checkins: boolean;
  can_use_ai_tutor: boolean;
  can_view_reports: boolean;
  can_receive_sos: boolean;
}

export function EducatorDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [tab, setTab] = useState<EducatorTab>("schedule");

  // Fetch educator's assigned students
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["educator_assignments", user?.id],
    queryFn: async () => {
      const { data: educators } = await supabase
        .from("educators" as any)
        .select("id")
        .eq("user_id", user!.id);
      
      if (!educators || (educators as any[]).length === 0) return [];

      const educatorIds = (educators as any[]).map((e: unknown) => e.id);
      
      const { data, error } = await supabase
        .from("educator_students" as any)
        .select("*")
        .in("educator_id", educatorIds);
      
      if (error) throw error;
      return (data || []) as any as EducatorStudent[];
    },
    enabled: !!user?.id,
  });

  // Get student display names + parent_id
  const { data: studentInfo = {} } = useQuery({
    queryKey: ["educator_student_info", assignments.map(a => a.student_id).join(",")],
    queryFn: async () => {
      if (assignments.length === 0) return {};
      const ids = assignments.map(a => a.student_id);
      const { data } = await supabase
        .from("students")
        .select("student_id, display_name, parent_id")
        .in("student_id", ids);
      
      const map: Record<string, { name: string; parent_id: string | null }> = {};
      (data || []).forEach((s: unknown) => {
        map[s.student_id] = { name: s.display_name, parent_id: s.parent_id };
      });
      return map;
    },
    enabled: assignments.length > 0,
  });

  // Auto-select first student
  useEffect(() => {
    if (!selectedStudentId && assignments.length > 0) {
      setSelectedStudentId(assignments[0].student_id);
    }
  }, [assignments, selectedStudentId]);

  const currentAssignment = assignments.find(a => a.student_id === selectedStudentId);
  const { data: blocks = [], isLoading: blocksLoading } = useDailyBlocks(selectedStudentId);
  const refreshBlocks = useRefreshBlocks();

  const tabs: { key: EducatorTab; icon: React.ElementType; label: string; visible: boolean }[] = [
    { key: "schedule", icon: BookOpen, label: t("nav.schedule") || "Schedule", visible: true },
    { key: "activity", icon: Activity, label: t("nav.feed") || "Activity", visible: true },
    { key: "checkins", icon: CheckSquare, label: t("nav.checkin") || "Check-ins", visible: currentAssignment?.can_view_checkins !== false },
    { key: "reports", icon: BarChart3, label: t("nav.reports") || "Reports", visible: currentAssignment?.can_view_reports !== false },
    { key: "tutor", icon: Bot, label: "Mr A", visible: currentAssignment?.can_use_ai_tutor === true },
    { key: "groups", icon: Users, label: t("educators.groups") || "Groups", visible: true },
  ];

  if (loadingAssignments) {
    return (
      <div className="py-8 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <GraduationCap size={48} className="mx-auto text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold">
          {t("educators.noStudentsAssigned") || "No Students Assigned"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("educators.waitForInvite") || "You'll see students here once a parent assigns you."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Student selector */}
      <div className="flex items-center gap-3">
        <GraduationCap size={20} className="text-[#D85A30]" />
        <Select value={selectedStudentId || ""} onValueChange={setSelectedStudentId}>
          <SelectTrigger className="w-[200px] font-display">
            <SelectValue placeholder="Select Student" />
          </SelectTrigger>
          <SelectContent>
            {assignments.map(a => (
              <SelectItem key={a.student_id} value={a.student_id}>
                {studentInfo[a.student_id]?.name || a.student_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Invite Parent button if student has no parent */}
        {selectedStudentId && studentInfo[selectedStudentId] && !studentInfo[selectedStudentId].parent_id && (
          <EducatorParentInviteButton
            studentId={selectedStudentId}
            studentName={studentInfo[selectedStudentId].name || selectedStudentId}
          />
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.filter(t => t.visible).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === key
                ? "bg-[#D85A30] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "groups" ? (
        <EducatorGroupsPanel />
      ) : selectedStudentId && (
        <div className="mt-4">
          {tab === "schedule" && (
            blocksLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : (
              <TodayBlocks blocks={blocks} onRefresh={refreshBlocks} />
            )
          )}
          {tab === "activity" && <ActivityFeed studentId={selectedStudentId} />}
          {tab === "checkins" && currentAssignment?.can_view_checkins && (
            <CheckInForm studentId={selectedStudentId} onDone={refreshBlocks} />
          )}
          {tab === "reports" && currentAssignment?.can_view_reports && selectedStudentId && (
            <ReportsPanel studentId={selectedStudentId} />
          )}
          {tab === "tutor" && currentAssignment?.can_use_ai_tutor && (
            <TutorChat />
          )}
        </div>
      )}
    </div>
  );
}
