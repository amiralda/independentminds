import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserPlus, GraduationCap } from "lucide-react";

interface Props {
  onAddStudent: () => void;
}

export function StudentSelector({ onAddStudent }: Props) {
  const { t } = useI18n();
  const { students, selectedStudentId, setSelectedStudentId } = useAuth();

  if (students.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <GraduationCap size={48} className="mx-auto text-muted-foreground" />
        <p className="font-display text-lg text-muted-foreground">{t("student.noStudents")}</p>
        <p className="text-sm text-muted-foreground">{t("student.addDescription")}</p>
        <Button onClick={onAddStudent} className="font-display bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <UserPlus size={16} className="mr-2" /> {t("action.addStudent")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedStudentId || ""} onValueChange={setSelectedStudentId}>
        <SelectTrigger className="w-[180px] font-display">
          <SelectValue placeholder={t("action.selectStudent")} />
        </SelectTrigger>
        <SelectContent>
          {students.map(s => (
            <SelectItem key={s.student_id} value={s.student_id}>
              <span className="flex items-center gap-2">
                <GraduationCap size={14} />
                {s.display_name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={onAddStudent} title={t("action.addStudent")}>
        <UserPlus size={16} />
      </Button>
    </div>
  );
}
