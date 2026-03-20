import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, GraduationCap, Calendar, MapPin, Users, BookOpen, Award, TrendingUp, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

interface StudentData {
  student_id: string;
  display_name: string;
  grade_level: number;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  profile_photo_url: string | null;
  enrollment_date: string | null;
  academic_year: string | null;
  parent_name: string | null;
  parent_email: string | null;
  parent_whatsapp: string | null;
}

interface Props {
  studentId: string;
}

export function StudentProfileCard({ studentId }: Props) {
  const { lang } = useI18n();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isParent = profile?.role === "parent";

  const { data: student, isLoading } = useQuery({
    queryKey: ["student_profile", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("student_id, display_name, grade_level, date_of_birth, nationality, address, profile_photo_url, enrollment_date, academic_year, parent_name, parent_email, parent_whatsapp")
        .eq("student_id", studentId)
        .single();
      if (error) throw error;
      return data as unknown as StudentData;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["student_profile_stats", studentId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const [planRes, achieveRes, checkInRes] = await Promise.all([
        supabase.from("daily_plan").select("id, status", { count: "exact" }).eq("student_id", studentId),
        supabase.from("achievements").select("id", { count: "exact" }).eq("student_id", studentId),
        supabase.from("check_ins").select("id", { count: "exact" }).eq("student_id", studentId),
      ]);
      const totalBlocks = planRes.count || 0;
      const doneBlocks = planRes.data?.filter(b => b.status === "Done").length || 0;
      return {
        totalBlocks,
        completedBlocks: doneBlocks,
        completionRate: totalBlocks > 0 ? Math.round((doneBlocks / totalBlocks) * 100) : 0,
        badges: achieveRes.count || 0,
        checkIns: checkInRes.count || 0,
      };
    },
  });

  const [form, setForm] = useState({
    display_name: "",
    date_of_birth: "",
    nationality: "",
    address: "",
    parent_name: "",
    parent_email: "",
    parent_whatsapp: "",
    grade_level: 7,
    academic_year: "",
  });

  const startEdit = () => {
    if (!student) return;
    setForm({
      display_name: student.display_name || "",
      date_of_birth: student.date_of_birth || "",
      nationality: student.nationality || "",
      address: student.address || "",
      parent_name: student.parent_name || "",
      parent_email: student.parent_email || "",
      parent_whatsapp: student.parent_whatsapp || "",
      grade_level: student.grade_level,
      academic_year: student.academic_year || "",
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    try {
      const { error } = await supabase
        .from("students")
        .update({
          display_name: form.display_name,
          date_of_birth: form.date_of_birth || null,
          nationality: form.nationality || null,
          address: form.address || null,
          parent_name: form.parent_name || null,
          parent_email: form.parent_email || null,
          parent_whatsapp: form.parent_whatsapp || null,
          grade_level: form.grade_level,
          academic_year: form.academic_year || null,
        })
        .eq("student_id", studentId);
      if (error) { console.error("Profile update error:", error); toast.error("Failed to update: " + error.message); return; }
    toast.success("Profile updated!");
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["student_profile", studentId] });
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${studentId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("student-photos").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("student-photos").getPublicUrl(path);
    const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("students").update({ profile_photo_url: photoUrl } as any).eq("student_id", studentId);
    queryClient.invalidateQueries({ queryKey: ["student_profile", studentId] });
    toast.success("Photo updated!");
    setUploading(false);
  };

  const calculateAge = (dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  if (isLoading || !student) {
    return <div className="animate-pulse rounded-2xl bg-card border h-64" />;
  }

  return (
    <div className="space-y-4">
      {/* Profile Card */}
      <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="h-24 bg-gradient-to-r from-primary via-primary/80 to-secondary relative">
          <div className="absolute -bottom-12 left-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
                <AvatarImage src={student.profile_photo_url || undefined} alt={student.display_name} />
                <AvatarFallback className="text-2xl font-display bg-secondary text-secondary-foreground">
                  {student.display_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {isParent && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  <Camera size={14} />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
            </div>
          </div>
          {isParent && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-3 right-3 text-xs"
              onClick={startEdit}
            >
              <Pencil size={12} className="mr-1" /> {lang === "HT" ? "Modifye" : "Edit"}
            </Button>
          )}
        </div>

        {/* Student Info */}
        <div className="pt-14 px-6 pb-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-xl font-bold">{student.display_name}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <GraduationCap size={14} /> Grade {student.grade_level} · {student.academic_year || "2025-2026"}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success border border-success/20">
                Active
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {student.date_of_birth && (
              <InfoItem icon={Calendar} label={lang === "HT" ? "Laj" : "Age"} value={`${calculateAge(student.date_of_birth)} years`} />
            )}
            {student.nationality && (
              <InfoItem icon={MapPin} label={lang === "HT" ? "Nasyonalite" : "Nationality"} value={student.nationality} />
            )}
            {student.enrollment_date && (
              <InfoItem icon={BookOpen} label={lang === "HT" ? "Enskripsyon" : "Enrolled"} value={new Date(student.enrollment_date).toLocaleDateString()} />
            )}
            <InfoItem icon={Users} label="Student ID" value={student.student_id} />
          </div>
        </div>

        {/* Parent Info Section */}
        {(student.parent_name || student.parent_email) && (
          <div className="border-t px-6 py-4 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {lang === "HT" ? "Paran / Gadyen" : "Parent / Guardian"}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {student.parent_name && <p className="font-medium">{student.parent_name}</p>}
              {student.parent_email && <p className="text-muted-foreground truncate">{student.parent_email}</p>}
              {student.parent_whatsapp && <p className="text-muted-foreground">{student.parent_whatsapp}</p>}
            </div>
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <div className="border-t grid grid-cols-4 divide-x">
            <StatBox label={lang === "HT" ? "Konplete" : "Completion"} value={`${stats.completionRate}%`} icon={TrendingUp} color="text-primary" />
            <StatBox label={lang === "HT" ? "Blòk" : "Blocks"} value={`${stats.completedBlocks}`} icon={BookOpen} color="text-secondary" />
            <StatBox label={lang === "HT" ? "Badj" : "Badges"} value={`${stats.badges}`} icon={Award} color="text-accent" />
            <StatBox label="Check-ins" value={`${stats.checkIns}`} icon={Calendar} color="text-success" />
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {lang === "HT" ? "Modifye Pwofil" : "Edit Profile"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label={lang === "HT" ? "Non" : "Full Name"} value={form.display_name} onChange={v => setForm(f => ({ ...f, display_name: v }))} />
            <FormField label={lang === "HT" ? "Dat Nesans" : "Date of Birth"} value={form.date_of_birth} onChange={v => setForm(f => ({ ...f, date_of_birth: v }))} type="date" />
            <FormField label={lang === "HT" ? "Nasyonalite" : "Nationality"} value={form.nationality} onChange={v => setForm(f => ({ ...f, nationality: v }))} />
            <FormField label={lang === "HT" ? "Adrès" : "Address"} value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
            <div>
              <label className="text-sm font-medium">{lang === "HT" ? "Nivo" : "Grade Level"}</label>
              <Input type="number" min={1} max={12} value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: parseInt(e.target.value) || 7 }))} />
            </div>
            <FormField label={lang === "HT" ? "Ane Akademik" : "Academic Year"} value={form.academic_year} onChange={v => setForm(f => ({ ...f, academic_year: v }))} />
            <hr />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {lang === "HT" ? "Enfòmasyon Paran" : "Parent Information"}
            </p>
            <FormField label={lang === "HT" ? "Non Paran" : "Parent Name"} value={form.parent_name} onChange={v => setForm(f => ({ ...f, parent_name: v }))} />
            <FormField label="Email" value={form.parent_email} onChange={v => setForm(f => ({ ...f, parent_email: v }))} type="email" />
            <FormField label="WhatsApp" value={form.parent_whatsapp} onChange={v => setForm(f => ({ ...f, parent_whatsapp: v }))} />
            <div className="flex gap-2 pt-2">
              <Button onClick={saveProfile} className="flex-1 font-display"><Save size={14} className="mr-1" /> {lang === "HT" ? "Anrejistre" : "Save"}</Button>
              <Button variant="outline" onClick={() => setEditing(false)}><X size={14} /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="py-3 px-2 text-center">
      <Icon size={16} className={`mx-auto mb-1 ${color}`} />
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
