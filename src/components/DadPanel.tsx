import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BarChart3, Calendar, Plus, BookOpen, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { SubjectIcon } from "@/components/SubjectIcon";

const SUBJECTS = [
  "English",
  "ESL",
  "Math",
  "Science",
  "Social Studies",
  "Public Speaking",
  "Media Education",
];

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
  notes: string | null;
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

const EMPTY_FORM = {
  plan_date: new Date().toISOString().split("T")[0],
  start_time: "08:00",
  end_time: "08:50",
  subject: "English",
  block_order: 1,
  notes: "",
};

export function DadPanel() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const studentId = profile?.studentId || "CHRIS";

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold">{t("nav.dadPanel")}</h2>
      <Tabs defaultValue="alerts">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="alerts" className="font-display text-xs">
            <AlertTriangle size={14} className="mr-1" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="progress" className="font-display text-xs">
            <BarChart3 size={14} className="mr-1" /> Today
          </TabsTrigger>
          <TabsTrigger value="schedule" className="font-display text-xs">
            <Calendar size={14} className="mr-1" /> Schedule
          </TabsTrigger>
          <TabsTrigger value="curriculum" className="font-display text-xs">
            <BookOpen size={14} className="mr-1" /> Curriculum
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          <AlertsTab studentId={studentId} />
        </TabsContent>
        <TabsContent value="progress" className="mt-4">
          <TodayProgressTab studentId={studentId} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-4">
          <ScheduleBuilderTab studentId={studentId} />
        </TabsContent>
        <TabsContent value="curriculum" className="mt-4">
          <CurriculumTab />
        </TabsContent>
      </Tabs>

      {/* Production footer */}
      <p className="text-center text-xs text-muted-foreground pt-6 border-t mt-8">
        Independent Minds v1.0 — Production Ready
      </p>
    </div>
  );
}

/* ── Alerts Tab ── */
function AlertsTab({ studentId }: { studentId: string }) {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["dad_alerts", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*")
        .eq("student_id", studentId)
        .eq("need_help", true)
        .order("timestamp", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as CheckInRow[];
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle size={36} className="mx-auto mb-3 text-success" />
        <p className="font-display text-lg">No alerts 🎉</p>
        <p className="text-sm">Christian hasn't asked for help recently.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map(c => (
        <div key={c.id} className="rounded-xl bg-destructive/5 border border-destructive/20 p-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-destructive">⚠️ Help Needed</span>
            <span className="text-muted-foreground text-xs">
              {new Date(c.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm mt-1">
            Mood: <strong>{c.mood}</strong> · Focus: <strong>{c.focus}</strong> · Blocks done: <strong>{c.blocks_done}</strong>
          </p>
          {c.comment && <p className="text-sm text-muted-foreground mt-1 italic">"{c.comment}"</p>}
        </div>
      ))}
    </div>
  );
}

/* ── Today's Progress Tab ── */
function TodayProgressTab({ studentId }: { studentId: string }) {
  const today = new Date().toISOString().split("T")[0];

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["dad_today", studentId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_plan")
        .select("*")
        .eq("student_id", studentId)
        .eq("plan_date", today)
        .order("block_order");
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
          <p className="text-[10px] text-muted-foreground">Done</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center">
          <p className="font-display text-2xl font-bold text-warning">{total - done}</p>
          <p className="text-[10px] text-muted-foreground">Remaining</p>
        </div>
        <div className="rounded-xl bg-card border p-3 text-center">
          <p className="font-display text-2xl font-bold text-secondary">
            {total > 0 ? Math.round((done / total) * 100) : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground">Complete</p>
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No blocks scheduled for today.</p>
      ) : (
        <div className="space-y-2">
          {blocks.map(b => (
            <div key={b.id} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3">
              <SubjectIcon subject={b.subject} size={20} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{b.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {b.time4learning_score != null && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {b.time4learning_score}%
                  </span>
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
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const { data: upcoming = [], isLoading } = useQuery({
    queryKey: ["dad_schedule", studentId, startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_plan")
        .select("*")
        .eq("student_id", studentId)
        .gte("plan_date", startDate)
        .lte("plan_date", endDate)
        .order("plan_date")
        .order("block_order");
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
          plan_date: form.plan_date,
          start_time: form.start_time,
          end_time: form.end_time,
          subject: form.subject,
          block_order: form.block_order,
          notes: form.notes || null,
        }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_plan").insert({
          student_id: studentId,
          plan_date: form.plan_date,
          start_time: form.start_time,
          end_time: form.end_time,
          subject: form.subject,
          block_order: form.block_order,
          notes: form.notes || null,
          status: "Planned",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Block updated!" : "Block added!");
      closeDialog();
      invalidateAll();
    },
    onError: () => toast.error("Failed to save block"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_plan").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Block deleted!");
      invalidateAll();
    },
    onError: () => toast.error("Failed to delete block"),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (p: DailyPlanRow) => {
    setEditingId(p.id);
    setForm({
      plan_date: p.plan_date,
      start_time: p.start_time.slice(0, 5),
      end_time: p.end_time.slice(0, 5),
      subject: p.subject,
      block_order: p.block_order,
      notes: p.notes || "",
    });
    setDialogOpen(true);
  };

  const byDate = upcoming.reduce<Record<string, DailyPlanRow[]>>((acc, p) => {
    (acc[p.plan_date] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogTrigger asChild>
          <Button className="w-full font-display" onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); }}>
            <Plus size={16} className="mr-2" /> Add Block
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? "Edit Block" : "Add Schedule Block"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={form.plan_date}
                onChange={e => setForm(f => ({ ...f, plan_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Start</label>
                <Input type="time" value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">End</label>
                <Input type="time" value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Block Order</label>
              <Input type="number" min={1} max={10} value={form.block_order}
                onChange={e => setForm(f => ({ ...f, block_order: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Notes / Lesson Path</label>
              <Textarea
                placeholder="Paste the Time4Learning lesson path or add notes..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <Button onClick={() => upsertMutation.mutate()} disabled={upsertMutation.isPending} className="w-full font-display">
              {upsertMutation.isPending ? "Saving..." : editingId ? "Update Block" : "Save Block"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : Object.keys(byDate).length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No upcoming blocks. Add one above!</p>
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
                  <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this block?")) deleteMutation.mutate(p.id); }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
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
