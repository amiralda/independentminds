import { useState, useEffect } from "react";
import { CoGuardiansPanel } from "@/components/CoGuardiansPanel";
import { InboxPanel } from "@/components/InboxPanel";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BarChart3, Calendar, Plus, BookOpen, Trash2, Pencil, Upload, Award, Settings, Activity, Bell, FileText, UserCircle, Wrench, Bot, Coins, ClipboardList, Menu, UserPlus, GraduationCap, Check, ChevronRight, Shield, Inbox, Eye } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { SubjectIcon } from "@/components/SubjectIcon";
import { CertificatesPanel } from "@/components/CertificatesPanel";
import { ReportsPanel } from "@/components/ReportsPanel";
import { TrackManagement } from "@/components/TrackManagement";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TelegramSettings } from "@/components/TelegramSettings";
import { StudentRecords } from "@/components/StudentRecords";
import { StudentProfileCard } from "@/components/StudentProfileCard";
import { LearningToolsHub } from "@/components/LearningToolsHub";
import { RewardsManagement } from "@/components/RewardsManagement";
import { TutorChat } from "@/components/TutorChat";
import { WeeklyProgressReport } from "@/components/WeeklyProgressReport";
import { ScheduleTemplates as ScheduleTemplatesImport } from "@/components/ScheduleTemplates";
import { MfaSettings } from "@/components/MfaSettings";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { AccountMergeRequest } from "@/components/AccountMergeRequest";

const SUBJECTS = ["English", "ESL", "Math", "Science", "Social Studies", "Public Speaking", "Media Education"];

interface DailyPlanRow {
  id: string; plan_date: string; block_order: number; start_time: string; end_time: string;
  subject: string; status: string; self_rating: number | null; time4learning_score: number | null; notes: string | null;
}

interface CheckInRow {
  id: string; timestamp: string; mood: string; focus: string; blocks_done: number; need_help: boolean; comment: string | null;
}

const EMPTY_FORM = {
  plan_date: new Date().toISOString().split("T")[0],
  start_time: "08:00", end_time: "08:50", subject: "English", block_order: 1, notes: "",
};

interface Props {
  onAddStudent: () => void;
  initialTab?: DadTab;
}

type DadTab = "activity" | "profile" | "progress" | "schedule" | "tracks" | "tools" | "tutor" | "curriculum" | "weekly" | "certificates" | "records" | "rewards" | "telegram" | "guardians" | "inbox";

interface NavItem {
  key: DadTab;
  icon: React.ElementType;
  label: string;
  labelHT: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "activity", icon: Activity, label: "Feed", labelHT: "Aktivite" },
  { key: "profile", icon: UserCircle, label: "Profile", labelHT: "Pwofil" },
  { key: "progress", icon: BarChart3, label: "Today", labelHT: "Jodi a" },
  { key: "schedule", icon: Calendar, label: "Schedule", labelHT: "Orè" },
  { key: "tracks", icon: Settings, label: "Tracks", labelHT: "Matyè" },
  { key: "tools", icon: Wrench, label: "Tools", labelHT: "Zouti" },
  { key: "tutor", icon: Bot, label: "Mr A", labelHT: "Mr A" },
  { key: "curriculum", icon: BookOpen, label: "Curriculum", labelHT: "Pwogram" },
  { key: "weekly", icon: ClipboardList, label: "Weekly", labelHT: "Semèn" },
  { key: "certificates", icon: Award, label: "Certificates", labelHT: "Sètifika" },
  { key: "records", icon: FileText, label: "Records", labelHT: "Dosye" },
  { key: "rewards", icon: Coins, label: "Rewards", labelHT: "Rekonpans" },
  { key: "inbox", icon: Inbox, label: "Inbox", labelHT: "Bwat mesaj" },
  { key: "telegram", icon: Bell, label: "Notifications", labelHT: "Notifikasyon" },
];

export function DadPanel({ onAddStudent, initialTab }: Props) {
  const { t, lang } = useI18n();
  const { students, selectedStudentId, setSelectedStudentId, setViewingAsStudent } = useAuth();
  const studentId = selectedStudentId || "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DadTab>(initialTab || "activity");

  // Allow parent to switch tab from outside
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const selectedStudent = students.find(s => s.student_id === selectedStudentId);
  const activeNavItem = NAV_ITEMS.find(n => n.key === activeTab);

  return (
    <div className="space-y-4">
      {/* Header with hamburger menu */}
      <div className="flex items-center gap-3">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <Menu size={24} className="text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="p-4 pb-2 border-b">
              <SheetTitle className="font-display text-lg">{t("nav.dadPanel")}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              {/* Co-Guardians section (above students) */}
              <div className="p-3 space-y-1 border-b">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1.5">
                  {lang === "HT" ? "Ko-gadyen" : "Co-Guardians"}
                </p>
                <button
                  onClick={() => { setActiveTab("guardians"); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    activeTab === "guardians"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Shield size={18} className={activeTab === "guardians" ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{lang === "HT" ? "Jere Ko-gadyen" : "Manage Co-Guardians"}</p>
                    <p className="text-[10px] text-muted-foreground">{lang === "HT" ? "Envite ak pèmisyon" : "Invites & permissions"}</p>
                  </div>
                  {activeTab === "guardians" && <Check size={16} className="text-primary flex-shrink-0" />}
                </button>
              </div>

              {/* Students section */}
              <div className="p-3 space-y-1 border-b">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1.5">
                  {lang === "HT" ? "Elèv yo" : "Students"}
                </p>
                {students.map(s => (
                  <button
                    key={s.student_id}
                    onClick={() => { setSelectedStudentId(s.student_id); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      selectedStudentId === s.student_id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <GraduationCap size={18} className={selectedStudentId === s.student_id ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">Grade {s.grade_level}</p>
                    </div>
                    {selectedStudentId === s.student_id && (
                      <Check size={16} className="text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
                <button
                  onClick={() => { onAddStudent(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-muted transition-colors text-muted-foreground mt-2 border border-dashed"
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <UserPlus size={18} />
                  </div>
                  <span className="text-sm font-medium">{t("action.addStudent")}</span>
                </button>
              </div>

              {/* Navigation section */}
              <div className="p-3 space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1.5">
                  {lang === "HT" ? "Navigasyon" : "Navigation"}
                </p>
                {NAV_ITEMS.map(({ key, icon: Icon, label, labelHT }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm ${
                      activeTab === key
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <Icon size={16} className={activeTab === key ? "text-primary" : "text-muted-foreground"} />
                    <span className="flex-1">{lang === "HT" ? labelHT : label}</span>
                    {activeTab === key && <ChevronRight size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 min-w-0">
          <h2 className="font-display text-xl font-bold leading-tight">{t("nav.dadPanel")}</h2>
          {selectedStudent && (
            <p className="text-sm text-muted-foreground truncate">
              {selectedStudent.display_name} · Grade {selectedStudent.grade_level}
            </p>
          )}
        </div>
      </div>

      {!studentId ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap size={48} className="mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-display text-lg">{t("action.selectStudent")}</p>
          <p className="text-sm mt-1">{lang === "HT" ? "Tape ☰ pou chwazi yon elèv" : "Tap ☰ to choose a student"}</p>
        </div>
      ) : (
        <>
          {/* Alert Banner */}
          <AlertBanner studentId={studentId} />

          {/* Active tab indicator */}
          {activeNavItem && (
            <div className="flex items-center gap-2 px-1">
              <activeNavItem.icon size={16} className="text-primary" />
              <h3 className="font-display font-semibold text-base">
                {lang === "HT" ? activeNavItem.labelHT : activeNavItem.label}
              </h3>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === "activity" && <ActivityFeed studentId={studentId} />}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <StudentProfileCard studentId={studentId} />
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                  {lang === "HT" ? "Paramèt Kont" : "Account Settings"}
                </p>
                <MfaSettings />
                <AccountMergeRequest />
                <DeleteAccountButton />
              </div>
            </div>
          )}
          {activeTab === "progress" && <TodayProgressTab studentId={studentId} />}
          {activeTab === "schedule" && <ScheduleBuilderTab studentId={studentId} />}
          {activeTab === "tracks" && <TrackManagement studentId={studentId} />}
          {activeTab === "tools" && <LearningToolsHub studentId={studentId} />}
          {activeTab === "tutor" && <TutorChat />}
          {activeTab === "curriculum" && <CurriculumTab />}
          {activeTab === "weekly" && <WeeklyProgressReport studentId={studentId} />}
          {activeTab === "certificates" && <CertificatesPanel studentId={studentId} />}
          {activeTab === "records" && <StudentRecords studentId={studentId} />}
          {activeTab === "rewards" && <RewardsManagement studentId={studentId} />}
          {activeTab === "guardians" && <CoGuardiansPanel studentId={studentId} />}
          {activeTab === "inbox" && <InboxPanel />}
          {activeTab === "telegram" && <TelegramSettings />}
        </>
      )}

      <p className="text-center text-xs text-muted-foreground pt-6 border-t mt-8">
        {t("app.version")} — Built with Love by KòdLabo
      </p>
    </div>
  );
}

/* ── Alert Banner (dismissible) ── */
function AlertBanner({ studentId }: { studentId: string }) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: alerts = [] } = useQuery({
    queryKey: ["dad_alerts", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins").select("*").eq("student_id", studentId)
        .eq("need_help", true).order("timestamp", { ascending: false }).limit(5);
      if (error) throw error;
      return data as CheckInRow[];
    },
  });

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map(c => (
        <div key={c.id} className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 animate-slide-up">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <AlertTriangle size={14} className="text-destructive flex-shrink-0" />
              <span className="text-sm font-medium text-destructive truncate">
                ⚠️ {t("helpNeeded")} — {c.mood} · {c.focus}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded"
              >
                {expandedId === c.id ? "▲" : "▼"}
              </button>
              <button
                onClick={() => setDismissed(prev => new Set(prev).add(c.id))}
                className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
          {expandedId === c.id && (
            <div className="mt-2 pt-2 border-t border-destructive/10 text-sm space-y-1">
              <p>Mood: <strong>{c.mood}</strong> · Focus: <strong>{c.focus}</strong> · {t("blocks.done")}: <strong>{c.blocks_done}</strong></p>
              <p className="text-xs text-muted-foreground">{new Date(c.timestamp).toLocaleString()}</p>
              {c.comment && <p className="text-xs text-muted-foreground italic">"{c.comment}"</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Today's Progress Tab ── */
function TodayProgressTab({ studentId }: { studentId: string }) {
  const { t } = useI18n();
  const today = new Date().toISOString().split("T")[0];
  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["dad_today", studentId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_plan").select("*").eq("student_id", studentId)
        .eq("plan_date", today).order("block_order");
      if (error) throw error;
      return data as DailyPlanRow[];
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  const done = blocks.filter(b => b.status === "Done").length;
  const total = blocks.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card border p-3 text-center">
          <p className="font-display text-2xl font-bold text-primary">{done}</p>
          <p className="text-[10px] text-muted-foreground">{t("done")}</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center">
          <p className="font-display text-2xl font-bold text-warning">{total - done}</p>
          <p className="text-[10px] text-muted-foreground">{t("remaining")}</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center">
          <p className="font-display text-2xl font-bold text-secondary">
            {total > 0 ? Math.round((done / total) * 100) : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground">{t("complete")}</p>
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("schedule.noBlocks")}</p>
      ) : (
        <div className="space-y-2">
          {blocks.map(b => (
            <div key={b.id} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
              <SubjectIcon subject={b.subject} size={20} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{b.subject}</p>
                <p className="text-xs text-muted-foreground">{b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</p>
              </div>
              <div className="flex items-center gap-2">
                {b.time4learning_score != null && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{b.time4learning_score}%</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  b.status === "Done" ? "bg-success/20 text-success" :
                  b.status === "In Progress" ? "bg-warning/20 text-warning" :
                  b.status === "Missed" ? "bg-destructive/20 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>{b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Schedule Builder Tab ── */
function ScheduleBuilderTab({ studentId }: { studentId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ""; });
      return {
        student_id: studentId, plan_date: row.plan_date,
        block_order: parseInt(row.block_order) || 1, start_time: row.start_time,
        end_time: row.end_time, subject: row.subject,
        status: row.status || "Planned", notes: row.notes || null,
      };
    }).filter(r => r.plan_date && r.subject && r.start_time && r.end_time);
    if (rows.length === 0) { toast.error("No valid rows found in CSV"); return; }
    const { error } = await supabase.from("daily_plan").insert(rows);
    if (error) { toast.error("Upload failed: " + error.message); return; }
    toast.success(`${rows.length} blocks imported!`);
    invalidateAll();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const { data: upcoming = [], isLoading } = useQuery({
    queryKey: ["dad_schedule", studentId, startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_plan").select("*").eq("student_id", studentId)
        .gte("plan_date", startDate).lte("plan_date", endDate)
        .order("plan_date").order("block_order");
      if (error) throw error;
      return data as DailyPlanRow[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["dad_schedule"] });
    queryClient.invalidateQueries({ queryKey: ["dad_today"] });
    queryClient.invalidateQueries({ queryKey: ["daily_blocks"] });
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("daily_plan").update({
          plan_date: form.plan_date, start_time: form.start_time, end_time: form.end_time,
          subject: form.subject, block_order: form.block_order, notes: form.notes || null,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_plan").insert({
          student_id: studentId, plan_date: form.plan_date, start_time: form.start_time,
          end_time: form.end_time, subject: form.subject, block_order: form.block_order,
          notes: form.notes || null, status: "Planned",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editingId ? "Block updated!" : "Block added!"); closeDialog(); invalidateAll(); },
    onError: () => toast.error("Failed to save block"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_plan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Block deleted!"); invalidateAll(); },
    onError: () => toast.error("Failed to delete block"),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm({ ...EMPTY_FORM }); };
  const openEdit = (p: DailyPlanRow) => {
    setEditingId(p.id);
    setForm({ plan_date: p.plan_date, start_time: p.start_time.slice(0, 5), end_time: p.end_time.slice(0, 5), subject: p.subject, block_order: p.block_order, notes: p.notes || "" });
    setDialogOpen(true);
  };

  const byDate = upcoming.reduce<Record<string, DailyPlanRow[]>>((acc, p) => { (acc[p.plan_date] ||= []).push(p); return acc; }, {});

  return (
    <div className="space-y-4">
      <ScheduleTemplatesImport studentId={studentId} />
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <div className="flex gap-2">
          <DialogTrigger asChild>
            <Button className="flex-1 font-display" onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); }}>
              <Plus size={16} className="mr-2" /> {t("schedule.addBlock")}
            </Button>
          </DialogTrigger>
          <Button variant="outline" className="font-display" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} className="mr-2" /> {t("schedule.bulkUpload")}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? t("schedule.editBlock") : t("schedule.addBlock")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{t("schedule.date")}</label>
              <Input type="date" value={form.plan_date} onChange={e => setForm(f => ({ ...f, plan_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">{t("schedule.start")}</label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">{t("schedule.end")}</label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("schedule.subject")}</label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("schedule.blockOrder")}</label>
              <Input type="number" min={1} max={10} value={form.block_order} onChange={e => setForm(f => ({ ...f, block_order: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <label className="text-sm font-medium">{t("notes")}</label>
              <Textarea placeholder="Lesson path or notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <Button onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending} className="w-full font-display">
              {upsertMutation.isPending ? t("loading") : editingId ? t("action.save") : t("action.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : Object.keys(byDate).length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("schedule.noBlocks")}</p>
      ) : (
        Object.entries(byDate).map(([date, plans]) => (
          <div key={date} className="rounded-xl bg-card border p-4 shadow-sm">
            <h3 className="font-display font-semibold mb-3">
              {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </h3>
            <div className="space-y-2">
              {plans.map(p => (
                <div key={p.id} className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3 py-2">
                  <SubjectIcon subject={p.subject} size={16} />
                  <span className="font-medium flex-1">{p.subject}</span>
                  <span className="text-muted-foreground text-xs">{p.start_time.slice(0, 5)} – {p.end_time.slice(0, 5)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === "Done" ? "bg-success/20 text-success" :
                    p.status === "In Progress" ? "bg-warning/20 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>{p.status}</span>
                  <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-primary p-1"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm("Delete this block?")) deleteMutation.mutate(p.id); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ── Curriculum Tab ── */
function CurriculumTab() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["curriculum_map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("curriculum_map").select("*").order("subject");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.map_id} className="rounded-xl bg-card border p-3 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{item.subject}</span>
              <h4 className="font-display font-semibold mt-1">{item.lesson_title}</h4>
              {item.unit_or_chapter && <p className="text-xs text-muted-foreground">{item.unit_or_chapter}</p>}
            </div>
            <span className="text-xs text-muted-foreground">{item.estimated_minutes} min</span>
          </div>
          {item.time4learning_path_hint && (
            <p className="text-xs text-muted-foreground mt-2 bg-muted px-2 py-1 rounded">📍 {item.time4learning_path_hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}
