import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, BookOpen, GraduationCap, Trash2, UserPlus } from "lucide-react";

const GROUP_COLORS = ["#D85A30", "#1D9E75", "#7F77DD", "#BA7517", "#378ADD", "#E24B4A"];

interface EducatorGroup {
  id: string;
  name: string;
  group_type: string;
  grade_level: string | null;
  subject: string | null;
  academic_year: string | null;
  description: string | null;
  color: string | null;
  educator_id: string;
}

interface GroupStudent {
  id: string;
  group_id: string;
  student_id: string;
  joined_at: string;
  notes: string | null;
}

export function EducatorGroupsPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"class" | "subject_group">("class");
  const [formGrade, setFormGrade] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formColor, setFormColor] = useState(GROUP_COLORS[0]);

  // Fetch educator id
  const { data: educatorId } = useQuery({
    queryKey: ["my_educator_id", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("educators" as any)
        .select("id")
        .eq("user_id", user!.id)
        .limit(1);
      return (data as any[])?.[0]?.id || null;
    },
    enabled: !!user?.id,
  });

  // Fetch groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["educator_groups", educatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educator_groups" as any)
        .select("*")
        .eq("educator_id", educatorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EducatorGroup[];
    },
    enabled: !!educatorId,
  });

  // Fetch group students for selected group
  const { data: groupStudents = [] } = useQuery({
    queryKey: ["educator_group_students", selectedGroup],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educator_group_students" as any)
        .select("*")
        .eq("group_id", selectedGroup);
      if (error) throw error;
      return (data || []) as unknown as GroupStudent[];
    },
    enabled: !!selectedGroup,
  });

  // Fetch educator's assigned students for adding to groups
  const { data: assignedStudents = [] } = useQuery({
    queryKey: ["educator_assigned_students", educatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("educator_students" as any)
        .select("student_id")
        .eq("educator_id", educatorId);
      if (!data) return [];
      const ids = (data as any[]).map((d: any) => d.student_id);
      const { data: students } = await supabase
        .from("students")
        .select("student_id, display_name")
        .in("student_id", ids);
      return (students || []) as { student_id: string; display_name: string }[];
    },
    enabled: !!educatorId,
  });

  // Fetch student names for group members
  const memberIds = groupStudents.map(gs => gs.student_id);
  const { data: memberNames = {} } = useQuery({
    queryKey: ["group_member_names", memberIds.join(",")],
    queryFn: async () => {
      if (memberIds.length === 0) return {};
      const { data } = await supabase
        .from("students")
        .select("student_id, display_name")
        .in("student_id", memberIds);
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => { map[s.student_id] = s.display_name; });
      return map;
    },
    enabled: memberIds.length > 0,
  });

  const createGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("educator_groups" as any).insert({
        educator_id: educatorId,
        name: formName,
        group_type: formType,
        grade_level: formType === "class" ? formGrade || null : null,
        subject: formType === "subject_group" ? formSubject || null : null,
        academic_year: formYear || null,
        description: formDesc || null,
        color: formColor,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educator_groups"] });
      setShowCreate(false);
      setFormName("");
      setFormGrade("");
      setFormSubject("");
      setFormYear("");
      setFormDesc("");
      toast.success(t("educators.groupCreated") || "Group created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addStudentToGroup = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase.from("educator_group_students" as any).insert({
        group_id: selectedGroup,
        student_id: studentId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educator_group_students"] });
      setShowAddStudent(false);
      toast.success(t("educators.studentAdded") || "Student added to group!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeStudent = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("educator_group_students" as any)
        .delete()
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educator_group_students"] });
      toast.success(t("educators.studentRemoved") || "Student removed from group.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("educator_groups" as any)
        .delete()
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educator_groups"] });
      setSelectedGroup(null);
      toast.success(t("educators.groupDeleted") || "Group deleted.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const activeGroup = groups.find(g => g.id === selectedGroup);
  const studentsInGroup = groupStudents.map(gs => gs.student_id);
  const availableStudents = assignedStudents.filter(
    s => !studentsInGroup.includes(s.student_id)
  );

  if (loadingGroups) {
    return <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-semibold">
          {t("educators.groups") || "Groups & Classes"}
        </h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#D85A30] hover:bg-[#C04E28]">
              <Plus size={16} className="mr-1" />
              {t("educators.newGroup") || "New Group"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("educators.createGroup") || "Create Group"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formType === "class" ? "default" : "outline"}
                  onClick={() => setFormType("class")}
                  className={formType === "class" ? "bg-[#D85A30] hover:bg-[#C04E28]" : ""}
                >
                  <GraduationCap size={16} className="mr-1" />
                  {t("educators.class") || "Classe"}
                </Button>
                <Button
                  type="button"
                  variant={formType === "subject_group" ? "default" : "outline"}
                  onClick={() => setFormType("subject_group")}
                  className={formType === "subject_group" ? "bg-[#D85A30] hover:bg-[#C04E28]" : ""}
                >
                  <BookOpen size={16} className="mr-1" />
                  {t("educators.subjectGroup") || "Groupe Matière"}
                </Button>
              </div>

              <div>
                <Label>{t("educators.groupName") || "Name"}</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={formType === "class" ? "Grade 3" : "Math Avancé"} />
              </div>

              {formType === "class" && (
                <div>
                  <Label>{t("educators.gradeLevel") || "Grade Level"}</Label>
                  <Input value={formGrade} onChange={e => setFormGrade(e.target.value)} placeholder="Grade 3 / CM1 / 6ème" />
                </div>
              )}

              {formType === "subject_group" && (
                <div>
                  <Label>{t("nav.schedule") || "Subject"}</Label>
                  <Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="Mathematics" />
                </div>
              )}

              <div>
                <Label>{t("educators.academicYear") || "Academic Year"}</Label>
                <Input value={formYear} onChange={e => setFormYear(e.target.value)} placeholder="2025-2026" />
              </div>

              <div>
                <Label>{t("educators.color") || "Color"}</Label>
                <div className="flex gap-2 mt-1">
                  {GROUP_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setFormColor(c)}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label>{t("educators.description") || "Description"}</Label>
                <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description..." rows={2} />
              </div>

              <Button
                className="w-full bg-[#D85A30] hover:bg-[#C04E28]"
                disabled={!formName.trim() || createGroup.isPending}
                onClick={() => createGroup.mutate()}
              >
                {createGroup.isPending ? "Creating..." : (t("educators.createGroup") || "Create Group")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t("educators.noGroups") || "No groups yet. Create one to organize your students."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {groups.map(g => (
            <Card
              key={g.id}
              className={`cursor-pointer transition-all ${selectedGroup === g.id ? "ring-2 ring-[#D85A30]" : "hover:shadow-md"}`}
              onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || "#D85A30" }} />
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {g.group_type === "class"
                        ? (t("educators.class") || "Classe")
                        : (t("educators.subjectGroup") || "Subject Group")}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); deleteGroup.mutate(g.id); }}
                    aria-label="Delete group"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
                {(g.grade_level || g.subject || g.academic_year) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {[g.grade_level, g.subject, g.academic_year].filter(Boolean).join(" · ")}
                  </p>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Group detail view */}
      {activeGroup && (
        <Card className="border-t-2" style={{ borderTopColor: activeGroup.color || "#D85A30" }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{activeGroup.name} — {t("educators.students") || "Students"}</CardTitle>
              <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <UserPlus size={14} className="mr-1" />
                    {t("educators.addStudent") || "Add Student"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("educators.addStudentToGroup") || "Add Student to Group"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableStudents.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        {t("educators.allStudentsAdded") || "All your students are already in this group."}
                      </p>
                    ) : (
                      availableStudents.map(s => (
                        <Button
                          key={s.student_id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => addStudentToGroup.mutate(s.student_id)}
                          disabled={addStudentToGroup.isPending}
                        >
                          {s.display_name || s.student_id}
                        </Button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {groupStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("educators.noStudentsInGroup") || "No students in this group yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {groupStudents.map(gs => (
                  <div key={gs.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">
                      {memberNames[gs.student_id] || gs.student_id}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStudent.mutate(gs.id)}
                      aria-label="Remove student from group"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
