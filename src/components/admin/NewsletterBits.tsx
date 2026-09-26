import ReactMarkdown from "react-markdown";
import { useI18n, type Lang } from "@/lib/i18n";
import type { NewsletterArticle } from "@/lib/newsletter";

const STATUS_STYLE: Record<NewsletterArticle["status"], string> = {
  pending_approval: "bg-amber-500/20 text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  sent: "bg-blue-500/20 text-blue-400",
  archived: "bg-white/10 text-white/50",
  mixed: "bg-purple-500/20 text-purple-300",
};

export function NewsletterStatusBadge({ status }: { status: NewsletterArticle["status"] }) {
  const { t } = useI18n();
  return (
    <span data-status={status} className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {t(`adminNews.status.${status}`)}
    </span>
  );
}

/** Picks one of the languages the article exists in. */
export function NewsletterLangSelect({
  value, options, onChange,
}: { value: Lang; options: Lang[]; onChange: (l: Lang) => void }) {
  const { t, languages } = useI18n();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Lang)}
      aria-label={t("adminNews.language")}
      data-testid="newsletter-lang"
      className="rounded-md bg-white/10 text-white text-xs px-2 py-1 border border-white/15 cursor-pointer"
    >
      {languages.filter(l => options.includes(l.code)).map(l => (
        <option key={l.code} value={l.code} className="text-foreground bg-background">
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}

/** Markdown preview styled for the dark admin theme (no typography plugin). */
export function NewsletterPreview({ markdown, rtl }: { markdown: string; rtl?: boolean }) {
  return (
    <div dir={rtl ? "rtl" : "ltr"} className="text-sm text-white/80 leading-relaxed space-y-3">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h3 className="text-lg font-semibold text-white pt-2">{children}</h3>,
          h2: ({ children }) => <h3 className="text-base font-semibold text-white pt-2">{children}</h3>,
          h3: ({ children }) => <h4 className="font-semibold text-white">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc ps-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ps-5 space-y-1">{children}</ol>,
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline text-blue-300">{children}</a>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
