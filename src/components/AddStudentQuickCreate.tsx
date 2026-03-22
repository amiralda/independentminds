import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Copy, Check, Mail, MessageSquare, Loader2 } from "lucide-react";

const DEFAULT_TRACKS = [
  { name: "Core Academics", category: "Core Academics", daily_target: 10, unit_type: "lessons", icon: "BookOpen", color: "secondary" },
  { name: "Reading & Literacy", category: "Core Academics", daily_target: 20, unit_type: "minutes", icon: "BookOpen", color: "success" },
  { name: "Language Lab", category: "Language Lab", daily_target: 1, unit_type: "sessions", icon: "Languages", color: "info" },
  { name: "Special Projects", category: "Creative Arts", daily_target: 1, unit_type: "sessions", icon: "Palette", color: "accent" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export function AddStudentQuickCreate({ open, onClose, onBack }: Props) {
  const { t, lang } = useI18n();
  const { user, refreshStudents, setSelectedStudentId } = useAuth();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("7");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;
  const parentName = user?.user_metadata?.display_name || user?.email || "Parent";

  const shareMessage = lang === "HT"
    ? `Bonjou! Mwen enskri ${name} nan platfòm Independent Minds EDU.\n\nEnfòmasyon elèv:\n• Non: ${name}\n• ID: ${studentId.toUpperCase()}\n• Klas: Grade ${grade}\n\nPou konplete pwofil elèv la, silvouplè konekte nan:\n${appUrl}\n\nMèsi!\n— ${parentName}`
    : `Hello! I have enrolled ${name} on the Independent Minds EDU platform.\n\nStudent Information:\n• Name: ${name}\n• ID: ${studentId.toUpperCase()}\n• Grade: Grade ${grade}\n\nTo complete the student profile, please sign in at:\n${appUrl}\n\nThank you!\n— ${parentName}`;

  const handleCreate = async () => {
    if (!name.trim() || !studentId.trim() || !user) {
      toast.error(lang === "HT" ? "Non ak ID elèv obligatwa" : "Name and Student ID are required");
      return;
    }

    setSaving(true);
    try {
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

      setSelectedStudentId(studentId.toUpperCase());
      refreshStudents();
      setCreated(true);
      toast.success(t("student.created"));
    } catch (err: any) {
      toast.error(err.message || "Failed to add student");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast.success(lang === "HT" ? "Kopye!" : "Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`${name} - Independent Minds EDU`);
    const body = encodeURIComponent(shareMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleSmsShare = () => {
    const body = encodeURIComponent(shareMessage);
    window.open(`sms:?body=${body}`);
  };

  const resetAndClose = () => {
    setName("");
    setStudentId("");
    setGrade("7");
    setCreated(false);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetAndClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {!created && (
              <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
                <ArrowLeft size={18} />
              </button>
            )}
            <DialogTitle className="font-display text-lg">
              {created
                ? (lang === "HT" ? "Elèv Kreye! ✅" : "Student Created! ✅")
                : (lang === "HT" ? "Kreye Rapid" : "Quick Create")} 🚀
            </DialogTitle>
          </div>
        </DialogHeader>

        {!created ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {lang === "HT"
                ? "Kreye yon pwofil bazik. Ou ka ajoute foto, orè, ak lòt detay aprè."
                : "Create a basic profile. You can add photo, schedule, and other details later."}
            </p>
            <div>
              <label className="text-sm font-medium">{t("student.name")} *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Christian" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t("student.id")} *</label>
              <Input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g., CHRIS" className="mt-1" />
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

            <Button onClick={handleCreate} disabled={saving || !name.trim() || !studentId.trim()} className="w-full font-display bg-secondary text-secondary-foreground hover:bg-secondary/90">
              {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
              {saving ? t("loading") : (lang === "HT" ? "Kreye Elèv" : "Create Student")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {lang === "HT"
                ? "Pwofil bazik la kreye. Voye mesaj sa a pa imèl oswa tèks pou pataje enfòmasyon yo:"
                : "Basic profile created. Share this message via email or text:"}
            </p>

            {/* Message preview */}
            <div className="rounded-xl bg-muted/50 p-3 text-xs whitespace-pre-wrap font-mono leading-relaxed border max-h-48 overflow-y-auto">
              {shareMessage}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs">
                {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                {copied ? (lang === "HT" ? "Kopye!" : "Copied!") : (lang === "HT" ? "Kopye" : "Copy")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleEmailShare} className="text-xs">
                <Mail size={14} className="mr-1" /> Email
              </Button>
              <Button variant="outline" size="sm" onClick={handleSmsShare} className="text-xs">
                <MessageSquare size={14} className="mr-1" /> SMS
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              {lang === "HT"
                ? "Ou ka ajoute foto, orè, ak lòt detay nan tab Elèv la."
                : "You can complete the profile with photo, schedule, and more from the Students tab."}
            </p>

            <Button onClick={resetAndClose} className="w-full font-display">
              {lang === "HT" ? "Fini" : "Done"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
