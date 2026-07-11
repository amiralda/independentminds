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

interface Props {
  studentId: string;
}

export function ScheduleTemplates({ studentId }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saveOpen, setSaveOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["schedule_templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_templates")
        .select("*")
        .order("is_builtin", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const invalidateSchedule = () => {
    queryClient.invalidateQueries({ queryKey: ["dad_schedule"] });
    queryClient.invalidateQueries({ queryKey: ["dad_today"] });
    queryClient.invalidateQueries({ queryKey: ["daily_blocks"] });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !user) return;
    setLoading(true);

    // Get current week's blocks
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const { data: blocks } = await supabase
      .from("daily_plan")
      .select("*")
      .eq("student_id", studentId)
      .gte("plan_date", monday.toISOString().split("T")[0])
      .lte("plan_date", friday.toISOString().split("T")[0])
      .order("plan_date")
      .order("block_order");

    if (!blocks || blocks.length === 0) {
      toast.error(t("schedule.noBlocks"));
      setLoading(false);
      return;
    }

    const templateBlocks = blocks.map(b => {
      const blockDate = new Date(b.plan_date + "T00:00:00");
      const dow = blockDate.getDay() === 0 ? 7 : blockDate.getDay();
      return {
        day_of_week: dow,
        start_time: b.start_time,
        end_time: b.end_time,
        subject: b.subject,
        notes: b.notes,
      };
    });

    const { error } = await supabase.from("schedule_templates").insert({
      parent_id: user.id,
      student_id: studentId,
      name: templateName.trim(),
      blocks: templateBlocks,
    } as any);

    if (error) {
      toast.error("Failed to save template");
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

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) { setLoading(false); return; }

    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const blocks = (template.blocks as any[]).map((b: unknown) => {
      const blockDate = new Date(monday);
      blockDate.setDate(monday.getDate() + (b.day_of_week - 1));
      return {
        student_id: studentId,
        plan_date: blockDate.toISOString().split("T")[0],
        start_time: b.start_time,
        end_time: b.end_time,
        subject: b.subject,
        block_order: 1,
        status: "Planned",
        notes: b.notes || null,
      };
    });

    const { error } = await supabase.from("daily_plan").insert(blocks);
    if (error) {
      toast.error("Failed to apply template");
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
    const today = new Date();
    const dayOfWeek = today.getDay();
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastFriday = new Date(lastMonday);
    lastFriday.setDate(lastMonday.getDate() + 4);

    const { data: lastWeekBlocks } = await supabase
      .from("daily_plan")
      .select("*")
      .eq("student_id", studentId)
      .gte("plan_date", lastMonday.toISOString().split("T")[0])
      .lte("plan_date", lastFriday.toISOString().split("T")[0]);

    if (!lastWeekBlocks || lastWeekBlocks.length === 0) {
      toast.error(t("schedule.noLastWeek"));
      setLoading(false);
      return;
    }

    const newBlocks = lastWeekBlocks.map(b => {
      const oldDate = new Date(b.plan_date + "T00:00:00");
      const newDate = new Date(oldDate);
      newDate.setDate(oldDate.getDate() + 7);
      return {
        student_id: studentId,
        plan_date: newDate.toISOString().split("T")[0],
        start_time: b.start_time,
        end_time: b.end_time,
        subject: b.subject,
        block_order: b.block_order,
        status: "Planned",
        notes: b.notes,
      };
    });

    const { error } = await supabase.from("daily_plan").insert(newBlocks);
    if (error) {
      toast.error("Failed to copy week");
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
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.is_builtin ? "⭐" : ""}
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
