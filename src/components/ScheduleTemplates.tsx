import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Copy, Layout } from "lucide-react";
import { toast } from "sonner";
import { useStudentFamilyId } from "@/hooks/useRewards";
import { composeTitle, PLAN_COLUMNS, type DailyPlanDbRow } from "@/lib/dailyPlan";

interface Props {
  studentId: string;
}

// One block of a saved week. Times/notes ride in `title` (see lib/dailyPlan).
interface TemplateBlock {
  day_of_week: number; // 1 = Monday … 7 = Sunday
  subject: string;
  title: string | null;
}

interface TemplateRow {
  id: string;
  name: string;
  blocks: unknown;
}

// Local calendar date as YYYY-MM-DD (toISOString would shift it by the UTC offset).
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const mondayOf = (d: Date) => {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = monday.getDay();
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
  return monday;
};

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

// Also accepts the legacy block shape (start_time/end_time/notes) in case an
// old template ever shows up.
function toTemplateBlocks(raw: unknown): TemplateBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((b) => {
    if (!b || typeof b !== "object") return [];
    const o = b as Record<string, unknown>;
    const day = Number(o.day_of_week);
    const subject = typeof o.subject === "string" ? o.subject : "";
    if (!subject || !(day >= 1 && day <= 7)) return [];
    const title = typeof o.title === "string"
      ? o.title
      : typeof o.start_time === "string" && typeof o.end_time === "string"
        ? composeTitle(subject, o.start_time, o.end_time, typeof o.notes === "string" ? o.notes : null)
        : null;
    return [{ day_of_week: day, subject, title }];
  });
}

export function ScheduleTemplates({ studentId }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: familyId } = useStudentFamilyId(studentId || null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(false);

  // Templates belong to the family (schedule_templates.parent_id).
  const { data: templates = [] } = useQuery({
    queryKey: ["schedule_templates", familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_templates")
        .select("id, name, blocks")
        .eq("parent_id", familyId!)
        .order("name");
      if (error) throw error;
      return (data || []) as TemplateRow[];
    },
    enabled: !!user && !!familyId,
  });

  const invalidateSchedule = () => {
    queryClient.invalidateQueries({ queryKey: ["dad_schedule"] });
    queryClient.invalidateQueries({ queryKey: ["dad_today"] });
    queryClient.invalidateQueries({ queryKey: ["daily_blocks"] });
  };

  const fetchWeek = async (monday: Date) => {
    const { data } = await supabase
      .from("daily_plan")
      .select(PLAN_COLUMNS)
      .eq("student_id", studentId)
      .gte("planned_date", ymd(monday))
      .lte("planned_date", ymd(addDays(monday, 4)))
      .order("planned_date")
      .order("created_at");
    return (data || []) as DailyPlanDbRow[];
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !user || !familyId) return;
    setLoading(true);

    const rows = await fetchWeek(mondayOf(new Date()));
    if (rows.length === 0) {
      toast.error(t("schedule.noBlocks"));
      setLoading(false);
      return;
    }

    const templateBlocks: TemplateBlock[] = rows.map((r) => {
      const dow = new Date(`${r.planned_date}T00:00:00`).getDay();
      return { day_of_week: dow === 0 ? 7 : dow, subject: r.subject, title: r.title };
    });

    const { error } = await supabase.from("schedule_templates").insert({
      parent_id: familyId,
      name: templateName.trim(),
      blocks: templateBlocks,
    } as never);

    if (error) {
      toast.error(t("schedule.templateSaveFailed"));
    } else {
      toast.success(t("schedule.templateSaved"));
      queryClient.invalidateQueries({ queryKey: ["schedule_templates"] });
    }
    setSaveOpen(false);
    setTemplateName("");
    setLoading(false);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !user) return;
    setLoading(true);

    const template = templates.find((tpl) => tpl.id === selectedTemplate);
    const blocks = template ? toTemplateBlocks(template.blocks) : [];
    if (blocks.length === 0) {
      toast.error(t("schedule.noBlocks"));
      setLoading(false);
      return;
    }

    const monday = mondayOf(new Date());
    const rows = blocks.map((b) => ({
      student_id: studentId,
      subject: b.subject,
      title: b.title,
      planned_date: ymd(addDays(monday, b.day_of_week - 1)),
      status: "planned",
    }));

    const { error } = await supabase.from("daily_plan").insert(rows as never);
    if (error) {
      toast.error(t("schedule.templateApplyFailed"));
    } else {
      toast.success(t("schedule.templateApplied"));
      invalidateSchedule();
    }
    setApplyOpen(false);
    setSelectedTemplate("");
    setLoading(false);
  };

  const handleCopyLastWeek = async () => {
    setLoading(true);
    const lastWeek = await fetchWeek(addDays(mondayOf(new Date()), -7));

    if (lastWeek.length === 0) {
      toast.error(t("schedule.noLastWeek"));
      setLoading(false);
      return;
    }

    const rows = lastWeek.map((r) => ({
      student_id: studentId,
      subject: r.subject,
      title: r.title,
      planned_date: ymd(addDays(new Date(`${r.planned_date}T00:00:00`), 7)),
      status: "planned",
    }));

    const { error } = await supabase.from("daily_plan").insert(rows as never);
    if (error) {
      toast.error(t("schedule.copyWeekFailed"));
    } else {
      toast.success(t("schedule.lastWeekCopied"));
      invalidateSchedule();
    }
    setLoading(false);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button size="sm" variant="outline" onClick={() => setSaveOpen(true)} disabled={loading}>
        <Save size={14} className="mr-1" />
        {t("schedule.saveTemplate")}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setApplyOpen(true)} disabled={loading}>
        <Layout size={14} className="mr-1" />
        {t("schedule.applyTemplate")}
      </Button>
      <Button size="sm" variant="outline" onClick={handleCopyLastWeek} disabled={loading}>
        <Copy size={14} className="mr-1" />
        {t("schedule.copyLastWeek")}
      </Button>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {t("schedule.saveScheduleTemplate")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={t("schedule.templateName")}
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
            />
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim() || loading} className="w-full">
              {t("action.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Apply dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {t("schedule.applyTemplate")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder={t("schedule.chooseTemplate")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleApplyTemplate} disabled={!selectedTemplate || loading} className="w-full">
              {t("schedule.apply")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
