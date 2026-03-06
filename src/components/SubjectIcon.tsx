import { BookOpen, Calculator, FlaskConical, Globe, Languages, Mic, Monitor, BookMarked } from "lucide-react";

const subjectConfig: Record<string, { icon: React.ElementType; color: string }> = {
  "English": { icon: BookOpen, color: "text-primary" },
  "Language Arts": { icon: BookOpen, color: "text-primary" },
  "ESL": { icon: Languages, color: "text-info" },
  "English Support": { icon: Languages, color: "text-info" },
  "Math": { icon: Calculator, color: "text-accent" },
  "Science": { icon: FlaskConical, color: "text-success" },
  "Social Studies": { icon: Globe, color: "text-destructive" },
  "Public Speaking": { icon: Mic, color: "text-warning" },
  "Media Education": { icon: Monitor, color: "text-muted-foreground" },
};

export function SubjectIcon({ subject, size = 20 }: { subject: string; size?: number }) {
  const config = subjectConfig[subject] || { icon: BookMarked, color: "text-muted-foreground" };
  const Icon = config.icon;
  return <Icon size={size} className={config.color} />;
}

export function getSubjectColor(subject: string): string {
  const colors: Record<string, string> = {
    "English": "bg-primary/10 border-primary/20",
    "Language Arts": "bg-primary/10 border-primary/20",
    "ESL": "bg-info/10 border-info/20",
    "English Support": "bg-info/10 border-info/20",
    "Math": "bg-accent/10 border-accent/20",
    "Science": "bg-success/10 border-success/20",
    "Social Studies": "bg-destructive/10 border-destructive/20",
    "Public Speaking": "bg-warning/10 border-warning/20",
    "Media Education": "bg-muted border-border",
  };
  return colors[subject] || "bg-muted border-border";
}
