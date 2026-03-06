import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ExternalLink, BookOpen, Globe, Languages, Video, Play } from "lucide-react";

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
      {/* Welcome Video Section */}
      <div className="rounded-xl bg-card border shadow-sm overflow-hidden">
        <div className="bg-primary/5 border-b px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play size={18} className="text-primary" />
            <h3 className="font-display font-semibold text-lg">🎬 Welcome to Independent Minds</h3>
          </div>
          <LanguageToggle />
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground mb-3">
            Watch the orientation video to learn how to use your dashboard.
            <br />
            <span className="text-xs">Gade videyo oryantasyon an pou aprann kijan pou itilize tablo bò ou. / Regardez la vidéo d'orientation.</span>
          </p>
          {/* Video embed placeholder — replace src with your uploaded video URL */}
          <div className="relative w-full aspect-video rounded-lg bg-muted flex items-center justify-center border border-dashed border-border">
            {/* 
              To embed your video, replace this div with:
              <iframe 
                className="w-full aspect-video rounded-lg" 
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen 
              />
            */}
            <div className="text-center text-muted-foreground">
              <Play size={48} className="mx-auto mb-2 opacity-40" />
              <p className="font-display text-sm font-medium">Orientation Video Coming Soon</p>
              <p className="text-xs mt-1">EN · FR · HT</p>
            </div>
          </div>
        </div>
      </div>

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
