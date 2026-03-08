import { useI18n, Lang } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";

const flags: Record<Lang, string> = { EN: "🇺🇸", HT: "🇭🇹" };

interface Props {
  variant?: "light" | "dark";
}

export function LanguageToggle({ variant = "light" }: Props) {
  const { lang, setLang } = useI18n();
  const { updateProfile } = useAuth();
  const langs: Lang[] = ["EN", "HT"];

  const handleChange = (l: Lang) => {
    setLang(l);
    updateProfile({ language_pref: l }).catch(() => {});
  };

  return (
    <div className={`flex gap-1 rounded-lg p-1 ${variant === "dark" ? "bg-primary-foreground/10" : "bg-muted"}`}>
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => handleChange(l)}
          className={`px-2 py-1 rounded-md text-sm font-medium transition-all ${
            lang === l
              ? variant === "dark"
                ? "bg-secondary text-secondary-foreground shadow-sm"
                : "bg-primary text-primary-foreground shadow-sm"
              : variant === "dark"
                ? "text-primary-foreground/70 hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-background"
          }`}
        >
          {flags[l]} {l}
        </button>
      ))}
    </div>
  );
}
