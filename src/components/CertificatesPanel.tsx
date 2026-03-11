import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAchievements } from "@/hooks/useAchievements";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ChapterProgress {
  chapter: string;
  subject: string;
  total: number;
  done: number;
  complete: boolean;
  mapIds: string[];
}

export function CertificatesPanel({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const { data: achievements = [] } = useAchievements(studentId);

  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ["chapter_progress", studentId],
    queryFn: async (): Promise<ChapterProgress[]> => {
      // Get all curriculum items with chapters
      const { data: curriculum } = await supabase
        .from("curriculum_map")
        .select("map_id, subject, unit_or_chapter")
        .not("unit_or_chapter", "is", null);

      if (!curriculum || curriculum.length === 0) return [];

      // Get all done blocks for this student that have map_ids
      const { data: doneBlocks } = await supabase
        .from("daily_plan")
        .select("map_id")
        .eq("student_id", studentId)
        .eq("status", "Done")
        .not("map_id", "is", null);

      const doneMapIds = new Set((doneBlocks || []).map(b => b.map_id));

      // Group by chapter
      const byChapter: Record<string, ChapterProgress> = {};
      for (const item of curriculum) {
        const ch = item.unit_or_chapter || "Unknown";
        if (!byChapter[ch]) {
          byChapter[ch] = { chapter: ch, subject: item.subject, total: 0, done: 0, complete: false, mapIds: [] };
        }
        byChapter[ch].total++;
        byChapter[ch].mapIds.push(item.map_id);
        if (doneMapIds.has(item.map_id)) byChapter[ch].done++;
      }

      return Object.values(byChapter).map(c => ({
        ...c,
        complete: c.total > 0 && c.done >= c.total,
      }));
    },
  });

  const awardCertMutation = useMutation({
    mutationFn: async (chapter: ChapterProgress) => {
      const { error } = await supabase.from("achievements").insert({
        student_id: studentId,
        type: "certificate",
        name: "Chapter Champion",
        description: `Completed all activities in ${chapter.chapter} (${chapter.subject})`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Certificate awarded! 🎓");
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });

  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  const generatePDF = (chapter: ChapterProgress) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const safeChapter = escapeHtml(chapter.chapter);
    const safeSubject = escapeHtml(chapter.subject);
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    w.document.write(`
      <!DOCTYPE html>
      <html><head><title>Certificate</title>
      <style>
        body { font-family: Georgia, serif; text-align: center; padding: 60px; background: #fffef5; }
        .border { border: 8px double #1F3B73; padding: 60px; margin: 20px; }
        h1 { color: #1F3B73; font-size: 36px; margin-bottom: 8px; }
        h2 { color: #F4C542; font-size: 24px; }
        .name { font-size: 32px; color: #1F3B73; margin: 30px 0; font-style: italic; }
        .detail { color: #555; font-size: 16px; margin: 10px 0; }
        .date { margin-top: 40px; color: #888; }
        @media print { body { padding: 0; } }
      </style></head><body>
        <div class="border">
          <h2>★ Independent Minds ★</h2>
          <h1>Chapter Champion Certificate</h1>
          <p class="detail">This certifies that</p>
          <p class="name">Christian</p>
          <p class="detail">has successfully completed all activities in</p>
          <p class="name">${safeChapter}</p>
          <p class="detail">${safeSubject}</p>
          <p class="date">${dateStr}</p>
          <p class="detail" style="margin-top:40px">Independent Minds v1.0 — Built with Love @2026</p>
        </div>
        <script>setTimeout(() => window.print(), 500);</script>
      </body></html>
    `);
    w.document.close();
  };

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  const completedChapters = chapters.filter(c => c.complete);
  const inProgressChapters = chapters.filter(c => !c.complete && c.done > 0);

  const hasCert = (ch: string) =>
    achievements.some(a => a.type === "certificate" && a.description?.includes(ch));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Award size={20} className="text-secondary" />
        <h3 className="font-display font-semibold text-lg">Certificates</h3>
      </div>

      {chapters.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No curriculum chapters found. Add curriculum items with chapters to track certificate progress.
        </p>
      )}

      {completedChapters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-success flex items-center gap-1">
            <CheckCircle2 size={14} /> Completed Chapters
          </h4>
          {completedChapters.map(ch => (
            <div key={ch.chapter} className="rounded-xl bg-success/5 border border-success/20 p-4 flex items-center gap-3">
              <Award size={24} className="text-secondary flex-shrink-0" />
              <div className="flex-1">
                <p className="font-display font-semibold">{ch.chapter}</p>
                <p className="text-xs text-muted-foreground">{ch.subject} · {ch.total} activities</p>
              </div>
              <div className="flex gap-2">
                {!hasCert(ch.chapter) && (
                  <Button size="sm" variant="secondary" onClick={() => awardCertMutation.mutate(ch)}>
                    Award 🎓
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => generatePDF(ch)}>
                  <Download size={14} className="mr-1" /> PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inProgressChapters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">In Progress</h4>
          {inProgressChapters.map(ch => (
            <div key={ch.chapter} className="rounded-xl bg-card border p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="font-display font-semibold text-sm">{ch.chapter}</p>
                <span className="text-xs text-muted-foreground">{ch.done}/{ch.total}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                  style={{ width: `${Math.round((ch.done / ch.total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
