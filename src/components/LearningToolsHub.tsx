import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ExternalLink, Trash2, BookOpen, Brain, Calculator, Globe, Palette, Music, Video, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface LearningTool {
  id: string;
  student_id: string;
  name: string;
  url: string;
  icon: string;
  category: string;
  description: string | null;
  is_suggested: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Brain, Calculator, Globe, Palette, Music, Video, Sparkles, ExternalLink,
};

const SUGGESTED_TOOLS = [
  { name: "Khan Academy", url: "https://www.khanacademy.org", icon: "Brain", category: "Learning", description: "Free courses in math, science, and more" },
  { name: "Time4Learning", url: "https://www.time4learning.com", icon: "BookOpen", category: "Curriculum", description: "Online curriculum for K-12" },
  { name: "Duolingo", url: "https://www.duolingo.com", icon: "Globe", category: "Languages", description: "Learn languages for free" },
  { name: "YouTube Education", url: "https://www.youtube.com/education", icon: "Video", category: "Videos", description: "Educational video content" },
  { name: "Scratch", url: "https://scratch.mit.edu", icon: "Palette", category: "Coding", description: "Creative coding for kids" },
  { name: "IXL Learning", url: "https://www.ixl.com", icon: "Calculator", category: "Practice", description: "Personalized learning & practice" },
  { name: "National Geographic Kids", url: "https://kids.nationalgeographic.com", icon: "Globe", category: "Science", description: "Explore the world with science & nature" },
  { name: "Prodigy Math", url: "https://www.prodigygame.com", icon: "Calculator", category: "Math", description: "Math game for students" },
  { name: "Google Arts & Culture", url: "https://artsandculture.google.com", icon: "Palette", category: "Arts", description: "Explore world art and culture" },
  { name: "Quizlet", url: "https://quizlet.com", icon: "Brain", category: "Study", description: "Flashcards and study tools" },
];

const CATEGORIES = ["Learning", "Curriculum", "Languages", "Videos", "Coding", "Practice", "Science", "Math", "Arts", "Study", "AI Tools", "Other"];

interface Props {
  studentId: string;
}

export function LearningToolsHub({ studentId }: Props) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isParent = profile?.role === "parent";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", icon: "ExternalLink", category: "Learning", description: "" });

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["learning_tools", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_tools")
        .select("*")
        .eq("student_id", studentId)
        .order("category")
        .order("name");
      if (error) throw error;
      return data as unknown as LearningTool[];
    },
  });

  const addTool = useMutation({
    mutationFn: async (tool: { name: string; url: string; icon: string; category: string; description: string; is_suggested?: boolean }) => {
      const { error } = await supabase.from("learning_tools").insert({
        student_id: studentId,
        name: tool.name,
        url: tool.url,
        icon: tool.icon,
        category: tool.category,
        description: tool.description || null,
        is_suggested: tool.is_suggested || false,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tool added!");
      queryClient.invalidateQueries({ queryKey: ["learning_tools", studentId] });
      setDialogOpen(false);
      setForm({ name: "", url: "", icon: "ExternalLink", category: "Learning", description: "" });
    },
    onError: () => toast.error("Failed to add tool"),
  });

  const removeTool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("learning_tools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tool removed");
      queryClient.invalidateQueries({ queryKey: ["learning_tools", studentId] });
    },
  });

  const addedNames = new Set(tools.map(t => t.name));
  const availableSuggestions = SUGGESTED_TOOLS.filter(s => !addedNames.has(s.name));

  const groupedTools = tools.reduce<Record<string, LearningTool[]>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">
            {t("tools.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("tools.subtitle")}
          </p>
        </div>
        {isParent && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-display">
                <Plus size={14} className="mr-1" /> {t("tools.addTool")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {t("tools.addToolTitle")}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">{t("student.name")}</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Khan Academy" />
                </div>
                <div>
                  <label className="text-sm font-medium">URL</label>
                  <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("challenges.category").replace(" (optional)", "").replace(" (opsyonèl)", "")}</label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description..." />
                </div>
                <Button
                  onClick={() => addTool.mutate(form)}
                  disabled={!form.name.trim() || !form.url.trim() || addTool.isPending}
                  className="w-full font-display"
                >
                  {t("tools.addTool")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active Tools by Category */}
      {Object.keys(groupedTools).length > 0 ? (
        Object.entries(groupedTools).map(([category, catTools]) => (
          <div key={category}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{category}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {catTools.map(tool => {
                const IconComp = ICON_MAP[tool.icon] || ExternalLink;
                return (
                  <div key={tool.id} className="group relative rounded-xl bg-card border hover:border-primary/30 p-3 transition-all">
                    <a href={tool.url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <IconComp size={16} className="text-primary" />
                        </div>
                        <ExternalLink size={10} className="text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="font-medium text-sm truncate">{tool.name}</p>
                      {tool.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{tool.description}</p>
                      )}
                    </a>
                    {isParent && (
                      <button
                        onClick={() => removeTool.mutate(tool.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t("tools.noTools")}</p>
        </div>
      )}

      {/* Suggested Tools */}
      {isParent && availableSuggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t("tools.suggested")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableSuggestions.map(s => {
              const IconComp = ICON_MAP[s.icon] || ExternalLink;
              return (
                <button
                  key={s.name}
                  onClick={() => addTool.mutate({ ...s, is_suggested: true })}
                  className="text-left rounded-xl border border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/30 hover:bg-muted/50 p-3 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <IconComp size={16} className="text-muted-foreground" />
                    </div>
                    <Plus size={12} className="text-muted-foreground ml-auto" />
                  </div>
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
