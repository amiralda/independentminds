import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, BarChart3, Calendar, Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface DailyPlanRow {
  id: string;
  plan_date: string;
  block_order: number;
  start_time: string;
  end_time: string;
  subject: string;
  status: string;
  self_rating: number | null;
  time4learning_score: number | null;
}

interface CheckInRow {
  id: string;
  timestamp: string;
  mood: string;
  focus: string;
  blocks_done: number;
  need_help: boolean;
  comment: string | null;
}

export function DadPanel() {
  const { t } = useI18n();
  const [weekPlans, setWeekPlans] = useState<DailyPlanRow[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newBlock, setNewBlock] = useState({
    plan_date: new Date().toISOString().split("T")[0],
    block_order: 1,
    start_time: "08:30",
    end_time: "09:15",
    subject: "Language Arts",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const [plansRes, checkInsRes] = await Promise.all([
      supabase
        .from("daily_plan")
        .select("*")
        .eq("student_id", "CHRIS")
        .gte("plan_date", monday.toISOString().split("T")[0])
        .lte("plan_date", sunday.toISOString().split("T")[0])
        .order("plan_date")
        .order("block_order"),
      supabase
        .from("check_ins")
        .select("*")
        .eq("student_id", "CHRIS")
        .order("timestamp", { ascending: false })
        .limit(10),
    ]);

    if (plansRes.data) setWeekPlans(plansRes.data);
    if (checkInsRes.data) setCheckIns(checkInsRes.data);
  };

  const handleAddBlock = async () => {
    const { error } = await supabase.from("daily_plan").insert({
      ...newBlock,
      student_id: "CHRIS",
      status: "Planned",
    });
    if (error) {
      toast.error("Error adding block");
    } else {
      toast.success("Block added!");
      setAddDialogOpen(false);
      fetchData();
    }
  };

  const subjects = ["Language Arts", "Math", "Science", "Social Studies", "English Support"];
  const needHelpAlerts = checkIns.filter(c => c.need_help);

  // Group plans by date
  const plansByDate = weekPlans.reduce<Record<string, DailyPlanRow[]>>((acc, plan) => {
    if (!acc[plan.plan_date]) acc[plan.plan_date] = [];
    acc[plan.plan_date].push(plan);
    return acc;
  }, {});

  const totalBlocks = weekPlans.length;
  const doneBlocks = weekPlans.filter(p => p.status === "Done").length;
  const missedBlocks = weekPlans.filter(p => p.status === "Missed").length;
  const avgRating = weekPlans.filter(p => p.self_rating).reduce((sum, p) => sum + (p.self_rating || 0), 0) / (weekPlans.filter(p => p.self_rating).length || 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">{t("nav.dadPanel")}</h2>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="schedule" className="font-display text-xs">
            <Calendar size={14} className="mr-1" /> {t("dad.schedule")}
          </TabsTrigger>
          <TabsTrigger value="progress" className="font-display text-xs">
            <BarChart3 size={14} className="mr-1" /> {t("dad.progress")}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="font-display text-xs relative">
            <AlertTriangle size={14} className="mr-1" /> {t("dad.alerts")}
            {needHelpAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center">
                {needHelpAlerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="curriculum" className="font-display text-xs">
            <BookOpen size={14} className="mr-1" /> {t("dad.curriculum")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4 space-y-4">
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full font-display">
                <Plus size={16} className="mr-2" /> Add Block
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add Schedule Block</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={newBlock.plan_date}
                    onChange={e => setNewBlock(p => ({ ...p, plan_date: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Start</label>
                    <Input
                      type="time"
                      value={newBlock.start_time}
                      onChange={e => setNewBlock(p => ({ ...p, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End</label>
                    <Input
                      type="time"
                      value={newBlock.end_time}
                      onChange={e => setNewBlock(p => ({ ...p, end_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Select value={newBlock.subject} onValueChange={v => setNewBlock(p => ({ ...p, subject: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Block Order</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={newBlock.block_order}
                    onChange={e => setNewBlock(p => ({ ...p, block_order: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <Button onClick={handleAddBlock} className="w-full font-display">{t("save")}</Button>
              </div>
            </DialogContent>
          </Dialog>

          {Object.entries(plansByDate).map(([date, plans]) => (
            <div key={date} className="rounded-xl bg-card border p-4 shadow-sm">
              <h3 className="font-display font-semibold mb-3">{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h3>
              <div className="space-y-2">
                {plans.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                    <span className="font-medium">{p.subject}</span>
                    <span className="text-muted-foreground">{p.start_time.slice(0, 5)} - {p.end_time.slice(0, 5)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === "Done" ? "bg-success/20 text-success" :
                      p.status === "In Progress" ? "bg-warning/20 text-warning" :
                      p.status === "Missed" ? "bg-destructive/20 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="progress" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-card border p-4 text-center">
              <p className="font-display text-3xl font-bold text-primary">{doneBlocks}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="rounded-xl bg-card border p-4 text-center">
              <p className="font-display text-3xl font-bold text-destructive">{missedBlocks}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
            <div className="rounded-xl bg-card border p-4 text-center">
              <p className="font-display text-3xl font-bold text-secondary">{totalBlocks > 0 ? Math.round((doneBlocks / totalBlocks) * 100) : 0}%</p>
              <p className="text-xs text-muted-foreground">Completion</p>
            </div>
            <div className="rounded-xl bg-card border p-4 text-center">
              <p className="font-display text-3xl font-bold text-warning">{avgRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
          </div>

          {/* Subject breakdown */}
          <div className="rounded-xl bg-card border p-4">
            <h3 className="font-display font-semibold mb-3">By Subject</h3>
            {subjects.map(s => {
              const subjectBlocks = weekPlans.filter(p => p.subject === s);
              const subjectDone = subjectBlocks.filter(p => p.status === "Done").length;
              const pct = subjectBlocks.length > 0 ? Math.round((subjectDone / subjectBlocks.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3 mb-2">
                  <span className="text-sm w-28 truncate">{s}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-3">
          {needHelpAlerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-display text-lg">No alerts 🎉</p>
              <p className="text-sm">Chris hasn't asked for help this week</p>
            </div>
          )}
          {needHelpAlerts.map(c => (
            <div key={c.id} className="rounded-xl bg-destructive/5 border border-destructive/20 p-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-destructive">⚠️ Help Needed</span>
                <span className="text-muted-foreground">{new Date(c.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1">Mood: {c.mood} | Focus: {c.focus}</p>
              {c.comment && <p className="text-sm text-muted-foreground mt-1">{c.comment}</p>}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="curriculum" className="mt-4">
          <CurriculumView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CurriculumView() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("curriculum_map").select("*").order("subject").then(({ data }) => {
      if (data) setItems(data);
    });
  }, []);

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
