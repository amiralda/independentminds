import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  variant?: "light" | "dark";
}

export function LanguageToggle({ variant = "light" }: Props) {
  const { lang, setLang, languages } = useI18n();
  const { updateProfile } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const l = e.target.value as Lang;
    setLang(l);
    updateProfile({ language_pref: l }).catch(() => {});
  };

  const current = languages.find(l => l.code === lang);

  return (
    <select
      value={lang}
      onChange={handleChange}
      className={`rounded-md text-sm font-medium px-2 py-1 border-none outline-none cursor-pointer ${
        variant === "dark"
          ? "bg-primary-foreground/10 text-primary-foreground"
          : "bg-muted text-foreground"
      }`}
      aria-label="Select language"
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code} className="text-foreground bg-background">
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}
