// Newsletter email template — the single source of truth for what a
// newsletter looks like in the inbox. Pure TypeScript, no imports, so the
// same file is used by:
//   - the admin preview (src/pages/admin/AdminNewsletterDetail.tsx, via Vite)
//   - the future send job (Deno edge function, FF5)
// Whatever the preview shows is exactly what will be sent.
//
// Markdown support (what the drafts use): #/##/### headings, paragraphs
// (single newlines = line breaks), "- "/"* " and "1. " lists, **bold**,
// *italic*, [text](https://link). Everything else is escaped as text.

export const NEWSLETTER_FROM = "Independent Minds EDU <noreply@independentmindsedu.org>";
export const SITE_URL = "https://www.independentmindsedu.org";

const BRAND = {
  navy: "#1A365D",
  green: "#1D9E75",
  text: "#374151",
  muted: "#9ca3af",
  page: "#f4f4f5",
  footerBg: "#f9fafb",
  border: "#e5e7eb",
};

type Lang = "en" | "ht" | "fr" | "es" | "pt" | "ar" | "zh" | "de" | "ja" | "ru";

// Footer/button text in the recipient's language.
const STRINGS: Record<Lang, { cta: string; why: string; unsubscribe: string }> = {
  en: { cta: "Visit Independent Minds EDU", why: "You are receiving this email because you have an Independent Minds EDU account.", unsubscribe: "Unsubscribe" },
  ht: { cta: "Vizite Independent Minds EDU", why: "Ou resevwa imèl sa a paske ou gen yon kont sou Independent Minds EDU.", unsubscribe: "Dezabòne" },
  fr: { cta: "Visiter Independent Minds EDU", why: "Vous recevez cet e-mail parce que vous avez un compte Independent Minds EDU.", unsubscribe: "Se désabonner" },
  es: { cta: "Visitar Independent Minds EDU", why: "Recibes este correo porque tienes una cuenta en Independent Minds EDU.", unsubscribe: "Darse de baja" },
  pt: { cta: "Visitar a Independent Minds EDU", why: "Você está recebendo este e-mail porque tem uma conta na Independent Minds EDU.", unsubscribe: "Cancelar inscrição" },
  ar: { cta: "زيارة Independent Minds EDU", why: "تتلقى هذه الرسالة لأن لديك حسابًا على Independent Minds EDU.", unsubscribe: "إلغاء الاشتراك" },
  zh: { cta: "访问 Independent Minds EDU", why: "您收到此邮件是因为您拥有 Independent Minds EDU 账户。", unsubscribe: "退订" },
  de: { cta: "Independent Minds EDU besuchen", why: "Sie erhalten diese E-Mail, weil Sie ein Konto bei Independent Minds EDU haben.", unsubscribe: "Abmelden" },
  ja: { cta: "Independent Minds EDU を開く", why: "Independent Minds EDU のアカウントをお持ちのため、このメールをお送りしています。", unsubscribe: "配信停止" },
  ru: { cta: "Перейти на Independent Minds EDU", why: "Вы получили это письмо, потому что у вас есть аккаунт Independent Minds EDU.", unsubscribe: "Отписаться" },
};

const toLang = (l: string): Lang => {
  const c = (l || "").trim().toLowerCase().split(/[-_]/)[0];
  return (c in STRINGS ? c : "en") as Lang;
};

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Inline Markdown on already-escaped text: links, bold, italic. */
function inline(escaped: string): string {
  return escaped
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g,
      (_m, text, href) => `<a href="${href}" style="color:${BRAND.green};text-decoration:underline">${text}</a>`)
    .replace(/\*\*([^*\n]+?)\*\*/g, `<strong style="color:${BRAND.navy}">$1</strong>`)
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
}

/** Markdown -> email-safe HTML (inline styles only, all text escaped). */
export function markdownToEmailHtml(md: string): string {
  const blocks = md.replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/);
  const p = `margin:0 0 16px;color:${BRAND.text};font-size:15px;line-height:1.6`;
  return blocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trimEnd());
    const h = /^(#{1,3})\s+(.*)$/.exec(lines[0]);
    if (h && lines.length === 1) {
      const size = h[1].length === 1 ? 22 : h[1].length === 2 ? 18 : 16;
      return `<h${h[1].length + 1} style="margin:24px 0 12px;color:${BRAND.navy};font-size:${size}px;line-height:1.3">${inline(escapeHtml(h[2]))}</h${h[1].length + 1}>`;
    }
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      const items = lines.map((l) => `<li style="margin:0 0 8px">${inline(escapeHtml(l.replace(/^\s*[-*]\s+/, "")))}</li>`).join("");
      return `<ul style="margin:0 0 16px;padding-inline-start:22px;color:${BRAND.text};font-size:15px;line-height:1.6">${items}</ul>`;
    }
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      const items = lines.map((l) => `<li style="margin:0 0 8px">${inline(escapeHtml(l.replace(/^\s*\d+[.)]\s+/, "")))}</li>`).join("");
      return `<ol style="margin:0 0 16px;padding-inline-start:22px;color:${BRAND.text};font-size:15px;line-height:1.6">${items}</ol>`;
    }
    return `<p style="${p}">${lines.map((l) => inline(escapeHtml(l))).join("<br>")}</p>`;
  }).join("\n");
}

export interface NewsletterEmailInput {
  title: string;
  markdown: string;
  language: string; // "EN" / "ht" / … — recipient's language
  unsubscribeUrl?: string; // per-recipient link, added by the send job
}

/** The full email: subject + complete HTML document. */
export function renderNewsletterEmail({ title, markdown, language, unsubscribeUrl }: NewsletterEmailInput) {
  const lang = toLang(language);
  const s = STRINGS[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#ffffff" dir="${dir}">
  <div style="background:${BRAND.navy};padding:24px 32px;text-align:center">
    <div style="color:#ffffff;margin:0;font-size:20px;font-weight:700">Independent Minds EDU</div>
  </div>
  <div style="padding:32px">
    <h1 style="margin:0 0 20px;color:${BRAND.navy};font-size:24px;line-height:1.3">${escapeHtml(title)}</h1>
${markdownToEmailHtml(markdown)}
    <div style="margin-top:32px;text-align:center">
      <a href="${SITE_URL}" style="display:inline-block;background:${BRAND.green};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(s.cta)}</a>
    </div>
  </div>
  <div style="padding:20px 32px;background:${BRAND.footerBg};border-top:1px solid ${BRAND.border};text-align:center">
    <p style="color:${BRAND.muted};font-size:12px;line-height:1.5;margin:0 0 6px">${escapeHtml(s.why)}</p>
    <p style="color:${BRAND.muted};font-size:12px;margin:0">Independent Minds EDU · <a href="${SITE_URL}" style="color:${BRAND.muted}">www.independentmindsedu.org</a>${
      unsubscribeUrl ? ` · <a href="${escapeHtml(unsubscribeUrl)}" style="color:${BRAND.muted}">${escapeHtml(s.unsubscribe)}</a>` : ""
    }</p>
  </div>
</div>
</body>
</html>`;
  return { from: NEWSLETTER_FROM, subject: title, html };
}
