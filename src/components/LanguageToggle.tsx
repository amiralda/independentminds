import { useI18n, Lang } from "@/lib/i18n";

const flags: Record<Lang, string> = { EN: "🇺🇸", HT: "🇭🇹", FR: "🇫🇷" };

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const langs: Lang[] = ["EN", "HT", "FR"];

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 rounded-md text-sm font-medium transition-all ${
            lang === l
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background"
          }`}
        >
          {flags[l]} {l}
        </button>
      ))}
    </div>
  );
}
