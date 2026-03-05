import { useI18n } from "@/lib/i18n";
import { ExternalLink, BookOpen, Globe, Languages, Video } from "lucide-react";

export function LibraryPanel() {
  const { t } = useI18n();

  const resources = [
    {
      title: "Time4Learning",
      description: "Main learning platform / Platfòm aprantisaj prensipal",
      url: "https://www.time4learning.com",
      icon: BookOpen,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Vocabulary.com",
      description: "Build your vocabulary / Bati vokabilè ou",
      url: "https://www.vocabulary.com",
      icon: Languages,
      color: "bg-secondary/10 text-secondary",
    },
    {
      title: "Khan Academy",
      description: "Extra math & science help / Èd siplemantè an matematik ak syans",
      url: "https://www.khanacademy.org",
      icon: Globe,
      color: "bg-accent/10 text-accent",
    },
    {
      title: "YouTube Education",
      description: "Educational videos / Videyo edikasyon",
      url: "https://www.youtube.com/education",
      icon: Video,
      color: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold">{t("library.title")}</h2>

      <div className="space-y-3">
        {resources.map((r) => (
          <a
            key={r.title}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-sm border hover:shadow-md transition-all group"
          >
            <div className={`rounded-lg p-3 ${r.color}`}>
              <r.icon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.description}</p>
            </div>
            <ExternalLink size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </a>
        ))}
      </div>

      {/* Tips section */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-5 mt-6">
        <h3 className="font-display font-semibold text-lg mb-2">💡 Study Tips / Konsèy Etid</h3>
        <ul className="space-y-2 text-sm">
          <li>• Read out loud to practice English / Li byen fò pou pratike Angle</li>
          <li>• Take 5-min breaks between blocks / Pran 5 minit pòz ant chak blòk</li>
          <li>• Write new words in a notebook / Ekri mo nouvo nan yon kaye</li>
          <li>• Ask Dad if you need help! / Mande Papa si ou bezwen èd!</li>
        </ul>
      </div>
    </div>
  );
}
