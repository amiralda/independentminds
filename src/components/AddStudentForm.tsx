import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const DEFAULT_TRACKS = [
  { name: "Core Academics", category: "Core Academics", daily_target: 10, unit_type: "lessons", icon: "BookOpen", color: "secondary" },
  { name: "Reading & Literacy", category: "Core Academics", daily_target: 20, unit_type: "minutes", icon: "BookOpen", color: "success" },
  { name: "Language Lab", category: "Language Lab", daily_target: 1, unit_type: "sessions", icon: "Languages", color: "info" },
  { name: "Special Projects", category: "Creative Arts", daily_target: 1, unit_type: "sessions", icon: "Palette", color: "accent" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddStudentForm({ open, onClose }: Props) {
  const { t } = useI18n();
  const { user, refreshStudents, setSelectedStudentId } = useAuth();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("7");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !studentId.trim() || !user) {
      toast.error("Name and Student ID are required");
      return;
    }

    setSaving(true);
    try {
      // Create student
      const { error: studentError } = await supabase.from("students").insert({
        student_id: studentId.toUpperCase(),
        display_name: name,
        grade_level: parseInt(grade),
        parent_id: user.id,
        parent_name: user.user_metadata?.display_name || user.email,
        parent_email: user.email,
      } as any);

      if (studentError) throw studentError;

      // Create default tracks
      const tracks = DEFAULT_TRACKS.map(track => ({
        ...track,
        student_id: studentId.toUpperCase(),
        enabled: true,
      }));

      const { error: tracksError } = await supabase.from("subject_tracks").insert(tracks as any);
      if (tracksError) console.error("Track creation error:", tracksError);

      toast.success(t("student.created"));
      setSelectedStudentId(studentId.toUpperCase());
      refreshStudents();
      onClose();
      setName("");
      setStudentId("");
      setGrade("7");
    } catch (err: any) {
      toast.error(err.message || "Failed to add student");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("action.addStudent")} 🎓</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("student.name")}</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Christian"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("student.id")}</label>
            <Input
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              placeholder="e.g., CHRIS"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Unique identifier for this student</p>
          </div>
          <div>
            <label className="text-sm font-medium">{t("student.grade")}</label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                  <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium mb-2">Default tracks will be created:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {DEFAULT_TRACKS.map(t => (
                <li key={t.name}>• {t.name} ({t.daily_target} {t.unit_type}/day)</li>
              ))}
            </ul>
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full font-display bg-secondary text-secondary-foreground hover:bg-secondary/90">
            {saving ? t("loading") : t("action.addStudent")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
