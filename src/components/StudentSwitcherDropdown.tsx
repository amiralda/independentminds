import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { GraduationCap, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function StudentSwitcherDropdown() {
  const { t } = useI18n();
  const { students, selectedStudentId, setSelectedStudentId } = useAuth();

  const selected = students.find(s => s.student_id === selectedStudentId);

  if (!selected) return null;

  if (students.length <= 1) {
    return (
      <div className="flex items-center gap-2" data-feature="student-switcher">
        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
          <GraduationCap size={16} className="text-secondary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm truncate">
            {selected.display_name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {`${t("student.gradeLabel")} ${selected.grade_level}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
        data-feature="student-switcher"
      >
        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={16} className="text-secondary-foreground" />
        </div>
        <div className="min-w-0 text-left">
          <p className="font-display font-semibold text-sm truncate">
            {selected.display_name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {`${t("student.gradeLabel")} ${selected.grade_level}`}
          </p>
        </div>
        <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {students.map(s => (
          <DropdownMenuItem
            key={s.student_id}
            onClick={() => setSelectedStudentId(s.student_id)}
            className={`flex items-center gap-3 ${
              s.student_id === selectedStudentId ? "bg-primary/10" : ""
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={14} className="text-secondary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{s.display_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {`${t("student.gradeLabel")} ${s.grade_level}`}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
