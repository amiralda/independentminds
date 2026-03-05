import { BookOpen, Calculator, FlaskConical, Globe, Languages } from "lucide-react";

const subjectConfig: Record<string, { icon: React.ElementType; color: string }> = {
  "Language Arts": { icon: BookOpen, color: "text-primary" },
  "Math": { icon: Calculator, color: "text-accent" },
  "Science": { icon: FlaskConical, color: "text-success" },
  "Social Studies": { icon: Globe, color: "text-destructive" },
  "English Support": { icon: Languages, color: "text-info" },
};

export function SubjectIcon({ subject, size = 20 }: { subject: string; size?: number }) {
  const config = subjectConfig[subject] || { icon: BookOpen, color: "text-muted-foreground" };
  const Icon = config.icon;
  return <Icon size={size} className={config.color} />;
}

export function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    "Language Arts": "bg-primary/10 border-primary/20",
    "Math": "bg-accent/10 border-accent/20",
    "Science": "bg-success/10 border-success/20",
    "Social Studies": "bg-destructive/10 border-destructive/20",
    "English Support": "bg-info/10 border-info/20",
  };
  return colors[subject] || "bg-muted border-border";
}
