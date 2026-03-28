import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Camera, Upload, FileText, Check, X, Loader2 } from "lucide-react";
import { generateStudentId } from "@/lib/generateStudentId";

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

type Step = 1 | 2 | 3;

interface ScheduleRow {
  subject: string;
  start_time: string;
  end_time: string;
  notes: string;
}

export function AddStudentFullForm({ open, onClose, onBack }: Props) {
  const { t, lang } = useI18n();
  const { user, refreshStudents, setSelectedStudentId } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const scheduleInputRef = useRef<HTMLInputElement>(null);

  // Step 1 fields
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("7");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [languagePref, setLanguagePref] = useState(lang);
  const [address, setAddress] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Step 2 fields (schedule)
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [extractedSchedule, setExtractedSchedule] = useState<ScheduleRow[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [scheduleValidated, setScheduleValidated] = useState(false);

  // Auto-generate student ID from name + DOB
  useEffect(() => {
    if (!name.trim() || name.trim().length < 2) {
      setStudentId("");
      return;
    }
    let cancelled = false;
    generateStudentId(name, dob || undefined).then(id => {
      if (!cancelled) setStudentId(id);
    });
    return () => { cancelled = true; };
  }, [name, dob]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleScheduleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScheduleFile(file);
    setExtracting(true);
    setScheduleValidated(false);

    try {
      // Read file as text or base64 depending on type
      const isText = file.name.endsWith(".csv") || file.name.endsWith(".txt");
      let content: string;

      if (isText) {
        content = await file.text();
      } else {
        const buffer = await file.arrayBuffer();
        content = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      }

      // Call AI to extract schedule data
      const { data, error } = await supabase.functions.invoke("extract-schedule", {
        body: {
          fileName: file.name,
          fileType: file.type,
          content,
          isBase64: !isText,
          grade: parseInt(grade),
        },
      });

      if (error) throw error;

      if (data?.schedule && Array.isArray(data.schedule)) {
        setExtractedSchedule(data.schedule);
      } else {
        toast.error(lang === "HT" ? "Pa ka ekstrè orè a" : "Could not extract schedule data");
      }
    } catch (err: any) {
      console.error("Schedule extraction error:", err);
      toast.error(lang === "HT" ? "Erè nan ekstraksyon" : "Error extracting schedule");
    } finally {
      setExtracting(false);
    }
  };

  const updateScheduleRow = (idx: number, field: keyof ScheduleRow, value: string) => {
    setExtractedSchedule(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    setScheduleValidated(false);
  };

  const removeScheduleRow = (idx: number) => {
    setExtractedSchedule(prev => prev.filter((_, i) => i !== idx));
    setScheduleValidated(false);
  };

  const addScheduleRow = () => {
    setExtractedSchedule(prev => [...prev, { subject: "", start_time: "08:00", end_time: "09:00", notes: "" }]);
    setScheduleValidated(false);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !studentId.trim() || !user) {
      toast.error(lang === "HT" ? "Non ak ID elèv obligatwa" : "Name and Student ID are required");
      return;
    }

    setSaving(true);
    try {
      let photoUrl: string | null = null;

      // Upload photo if provided
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${studentId.toUpperCase()}/profile.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("student-photos")
          .upload(path, photoFile, { upsert: true });
        if (uploadError) console.error("Photo upload error:", uploadError);
        else {
          const { data: urlData } = supabase.storage.from("student-photos").getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }
      }

      // Create student
      const { error: studentError } = await supabase.from("students").insert({
        student_id: studentId.toUpperCase(),
        display_name: name,
        grade_level: parseInt(grade),
        parent_id: user.id,
        parent_name: user.user_metadata?.display_name || user.email,
        parent_email: user.email,
        date_of_birth: dob || null,
        language_pref: languagePref,
        address: address || null,
        profile_photo_url: photoUrl,
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

      // Insert schedule blocks if any
      if (extractedSchedule.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const blocks = extractedSchedule.map((row, idx) => ({
          student_id: studentId.toUpperCase(),
          plan_date: today,
          block_order: idx + 1,
          subject: row.subject,
          start_time: row.start_time,
          end_time: row.end_time,
          notes: row.notes || null,
          status: "Planned",
        }));
        const { error: blocksError } = await supabase.from("daily_plan").insert(blocks as any);
        if (blocksError) console.error("Schedule block error:", blocksError);
      }

      toast.success(t("student.created"));
      setSelectedStudentId(studentId.toUpperCase());
      refreshStudents();
      resetAndClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to add student");
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setName("");
    setStudentId("");
    setGrade("7");
    setDob("");
    setNationality("");
    setAddress("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setScheduleFile(null);
    setExtractedSchedule([]);
    setScheduleValidated(false);
    onClose();
  };

  const canProceedStep1 = name.trim().length >= 2 && studentId.trim();

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetAndClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <button onClick={step === 1 ? onBack : () => setStep((step - 1) as Step)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={18} />
            </button>
            <DialogTitle className="font-display text-lg">
              {lang === "HT" ? "Fòm Konplè" : "Complete Profile Form"} 🎓
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1.5 mb-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          {lang === "HT" ? `Etap ${step} nan 3` : `Step ${step} of 3`}
          {" — "}
          {step === 1 && (lang === "HT" ? "Enfòmasyon Pèsonèl" : "Personal Information")}
          {step === 2 && (lang === "HT" ? "Orè & Dokiman" : "Schedule & Documents")}
          {step === 3 && (lang === "HT" ? "Revize & Soumèt" : "Review & Submit")}
        </p>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 mb-2">
              <button
                onClick={() => photoInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors overflow-hidden flex-shrink-0"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-muted-foreground" />
                )}
              </button>
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{lang === "HT" ? "Foto Pwofil" : "Profile Photo"}</p>
                <p>{lang === "HT" ? "Opsyonèl — klike pou ajoute" : "Optional — tap to add"}</p>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            <div>
              <label className="text-sm font-medium">{t("student.name")} *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Christian" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t("student.id")}</label>
              <Input value={studentId} readOnly className="mt-1 bg-muted cursor-not-allowed" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {lang === "HT" ? "Otomatikman jenere" : "Auto-generated from name & date of birth"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t("student.grade")} *</label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
                      <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{lang === "HT" ? "Dat Nesans" : "Date of Birth"}</label>
                <Input type="date" value={dob} onChange={e => setDob(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("student.preferredLanguage")}</label>
              <Select value={languagePref} onValueChange={setLanguagePref}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[
                    { code: "EN", label: "🇺🇸 English" },
                    { code: "HT", label: "🇭🇹 Kreyòl ayisyen" },
                    { code: "FR", label: "🇫🇷 Français" },
                    { code: "ES", label: "🇪🇸 Español" },
                    { code: "PT", label: "🇧🇷 Português" },
                    { code: "AR", label: "🇸🇦 العربية" },
                    { code: "ZH", label: "🇨🇳 中文" },
                    { code: "DE", label: "🇩🇪 Deutsch" },
                    { code: "JA", label: "🇯🇵 日本語" },
                    { code: "RU", label: "🇷🇺 Русский" },
                  ].map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{lang === "HT" ? "Adrès" : "Address"}</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g., Port-au-Prince, Haiti" className="mt-1" />
            </div>

            <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full font-display">
              {lang === "HT" ? "Kontinye" : "Continue"} <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Schedule Upload */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 text-center">
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {lang === "HT" ? "Telechaje Dokiman Orè" : "Upload Schedule Document"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 mb-3">
                {lang === "HT"
                  ? "CSV, Excel, PDF, oswa foto orè — AI ap ekstrè done yo"
                  : "CSV, Excel, PDF, or photo of schedule — AI will extract the data"}
              </p>
              <Button variant="outline" size="sm" onClick={() => scheduleInputRef.current?.click()} disabled={extracting}>
                {extracting ? (
                  <><Loader2 size={14} className="mr-2 animate-spin" /> {lang === "HT" ? "Ap ekstrè..." : "Extracting..."}</>
                ) : (
                  <><FileText size={14} className="mr-2" /> {lang === "HT" ? "Chwazi Fichye" : "Choose File"}</>
                )}
              </Button>
              <input
                ref={scheduleInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleScheduleUpload}
              />
              {scheduleFile && (
                <p className="text-xs text-muted-foreground mt-2">📎 {scheduleFile.name}</p>
              )}
            </div>

            {/* Extracted schedule table */}
            {extractedSchedule.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{lang === "HT" ? "Orè Ekstrè" : "Extracted Schedule"}</p>
                  <Button variant="ghost" size="sm" onClick={addScheduleRow}>+ {lang === "HT" ? "Ajoute" : "Add Row"}</Button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {extractedSchedule.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_80px_auto] gap-1.5 items-center">
                      <Input
                        value={row.subject}
                        onChange={e => updateScheduleRow(idx, "subject", e.target.value)}
                        placeholder="Subject"
                        className="h-8 text-xs"
                      />
                      <Input
                        type="time"
                        value={row.start_time}
                        onChange={e => updateScheduleRow(idx, "start_time", e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="time"
                        value={row.end_time}
                        onChange={e => updateScheduleRow(idx, "end_time", e.target.value)}
                        className="h-8 text-xs"
                      />
                      <button onClick={() => removeScheduleRow(idx)} className="text-destructive hover:text-destructive/80">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {!scheduleValidated && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setScheduleValidated(true)}>
                    <Check size={14} className="mr-2" /> {lang === "HT" ? "Valide Orè" : "Validate Schedule"}
                  </Button>
                )}
                {scheduleValidated && (
                  <p className="text-xs text-primary flex items-center gap-1"><Check size={12} /> {lang === "HT" ? "Orè valide!" : "Schedule validated!"}</p>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              {lang === "HT"
                ? "Ou ka sote etap sa a epi ajoute orè aprè."
                : "You can skip this step and add the schedule later."}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft size={14} className="mr-1" /> {lang === "HT" ? "Retounen" : "Back"}
              </Button>
              <Button onClick={() => setStep(3)} className="font-display">
                {lang === "HT" ? "Kontinye" : "Continue"} <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-3">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-display font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">ID: {studentId.toUpperCase()} · Grade {grade}</p>
                </div>
              </div>
              {dob && <p className="text-xs"><span className="text-muted-foreground">{lang === "HT" ? "Dat Nesans:" : "DOB:"}</span> {dob}</p>}
              {nationality && <p className="text-xs"><span className="text-muted-foreground">{lang === "HT" ? "Nasyonalite:" : "Nationality:"}</span> {nationality}</p>}
              {address && <p className="text-xs"><span className="text-muted-foreground">{lang === "HT" ? "Adrès:" : "Address:"}</span> {address}</p>}
            </div>

            {extractedSchedule.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs font-medium mb-1">{lang === "HT" ? "Orè" : "Schedule"} ({extractedSchedule.length} {lang === "HT" ? "blòk" : "blocks"})</p>
                <ul className="text-[11px] text-muted-foreground space-y-0.5">
                  {extractedSchedule.slice(0, 4).map((r, i) => (
                    <li key={i}>• {r.subject} ({r.start_time}–{r.end_time})</li>
                  ))}
                  {extractedSchedule.length > 4 && <li>+{extractedSchedule.length - 4} more...</li>}
                </ul>
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium mb-1">{lang === "HT" ? "Pist pa defo:" : "Default tracks:"}</p>
              <ul className="text-[11px] text-muted-foreground space-y-0.5">
                {DEFAULT_TRACKS.map(tr => (
                  <li key={tr.name}>• {tr.name} ({tr.daily_target} {tr.unit_type}/day)</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft size={14} className="mr-1" /> {lang === "HT" ? "Retounen" : "Back"}
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="font-display bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Check size={14} className="mr-2" />}
                {saving ? t("loading") : (lang === "HT" ? "Kreye Elèv" : "Create Student")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
