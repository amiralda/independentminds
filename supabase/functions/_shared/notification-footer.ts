// Footer + headers for the family's automatic emails (morning reminder,
// check-in reminder, daily report, weekly badge): tells the person why they
// get the email and links to the page where they pause or stop it.
//
// Pure TypeScript, no imports: used by the four Deno notification functions
// and by the unit tests (via Vite). The email BODY stays bilingual EN/HT and
// is built once per student; only this footer is per recipient, in their own
// UI language (profiles.language_pref, returned by
// notify_recipients_for_parent() together with their token).
//
// Links never change anything on GET (mail scanners open links): the footer
// goes to the www page, which POSTs when the person clicks. Only the RFC 8058
// header URL acts directly, and only on the POST mail providers send.

export const SITE_URL = "https://www.independentmindsedu.org";
const FUNCTIONS_URL = "https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1";

export const NOTIFICATION_CATEGORIES = ["morning_reminder", "checkin_reminder", "daily_report", "weekly_badge"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type Lang = "en" | "ht" | "fr" | "es" | "pt" | "ar" | "zh" | "de" | "ja" | "ru";

interface FooterStrings {
  parent: string; // {student} = the child's display name
  coGuardian: string;
  pauseThis: string;
  manageAll: string;
  noToken: string; // shown when the token lookup failed (parent-only fallback)
}

export const FOOTER_STRINGS: Record<Lang, FooterStrings> = {
  en: {
    parent: "You receive these emails as the parent of {student}.",
    coGuardian: "You receive these emails as a co-guardian for {student}.",
    pauseThis: "Pause or stop this type of email",
    manageAll: "Manage all emails",
    noToken: "You can manage these emails from your account.",
  },
  ht: {
    parent: "Ou resevwa imèl sa yo paske ou se paran {student}.",
    coGuardian: "Ou resevwa imèl sa yo paske ou se ko-gadyen {student}.",
    pauseThis: "Mete kalite imèl sa a sou pòz oswa sispann li",
    manageAll: "Jere tout imèl yo",
    noToken: "Ou ka jere imèl sa yo nan kont ou.",
  },
  fr: {
    parent: "Vous recevez ces e-mails en tant que parent de {student}.",
    coGuardian: "Vous recevez ces e-mails en tant que co-tuteur de {student}.",
    pauseThis: "Mettre en pause ou arrêter ce type d'e-mail",
    manageAll: "Gérer tous les e-mails",
    noToken: "Vous pouvez gérer ces e-mails depuis votre compte.",
  },
  es: {
    parent: "Recibe estos correos como padre o madre de {student}.",
    coGuardian: "Recibe estos correos como co-tutor de {student}.",
    pauseThis: "Pausar o detener este tipo de correo",
    manageAll: "Gestionar todos los correos",
    noToken: "Puede gestionar estos correos desde su cuenta.",
  },
  pt: {
    parent: "Você recebe estes e-mails como responsável por {student}.",
    coGuardian: "Você recebe estes e-mails como co-responsável por {student}.",
    pauseThis: "Pausar ou interromper este tipo de e-mail",
    manageAll: "Gerenciar todos os e-mails",
    noToken: "Você pode gerenciar estes e-mails na sua conta.",
  },
  ar: {
    parent: "تتلقى هذه الرسائل بصفتك ولي أمر {student}.",
    coGuardian: "تتلقى هذه الرسائل بصفتك وصيًا مشاركًا على {student}.",
    pauseThis: "إيقاف هذا النوع من الرسائل مؤقتًا أو نهائيًا",
    manageAll: "إدارة جميع الرسائل",
    noToken: "يمكنك إدارة هذه الرسائل من حسابك.",
  },
  zh: {
    parent: "您以 {student} 家长的身份收到这些邮件。",
    coGuardian: "您以 {student} 共同监护人的身份收到这些邮件。",
    pauseThis: "暂停或停止此类邮件",
    manageAll: "管理所有邮件",
    noToken: "您可以在账户中管理这些邮件。",
  },
  de: {
    parent: "Sie erhalten diese E-Mails als Elternteil von {student}.",
    coGuardian: "Sie erhalten diese E-Mails als Mit-Erziehungsberechtigte(r) von {student}.",
    pauseThis: "Diese Art von E-Mail pausieren oder abbestellen",
    manageAll: "Alle E-Mails verwalten",
    noToken: "Sie können diese E-Mails in Ihrem Konto verwalten.",
  },
  ja: {
    parent: "{student} の保護者として、このメールをお送りしています。",
    coGuardian: "{student} の共同保護者として、このメールをお送りしています。",
    pauseThis: "この種類のメールを一時停止または停止する",
    manageAll: "すべてのメールを管理",
    noToken: "これらのメールはアカウントから管理できます。",
  },
  ru: {
    parent: "Вы получаете эти письма как родитель {student}.",
    coGuardian: "Вы получаете эти письма как со-опекун {student}.",
    pauseThis: "Приостановить или отключить такие письма",
    manageAll: "Управлять всеми письмами",
    noToken: "Вы можете управлять этими письмами в своём аккаунте.",
  },
};

export const toLang = (l: string | null | undefined): Lang => {
  const c = (l || "").trim().toLowerCase().split(/[-_]/)[0];
  return (c in FOOTER_STRINGS ? c : "en") as Lang;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** The www page where the person pauses/stops (GET only shows; changes are POSTs). */
export const prefsPageUrl = (token: string, language: string, category?: NotificationCategory) =>
  `${SITE_URL}/notifications?token=${encodeURIComponent(token)}&lang=${toLang(language)}` +
  (category ? `&category=${encodeURIComponent(category)}` : "");

/** RFC 8058 one-click target: mail apps POST here; it stops THIS category only. */
export const prefsOneClickUrl = (token: string, category: NotificationCategory) =>
  `${FUNCTIONS_URL}/notification-preferences?token=${encodeURIComponent(token)}&category=${encodeURIComponent(category)}`;

/** Makes Gmail/Outlook/Apple Mail show their own "Unsubscribe" button for this category. */
export const prefsHeaders = (token: string, category: NotificationCategory) => ({
  "List-Unsubscribe": `<${prefsOneClickUrl(token, category)}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

export interface PrefsFooterInput {
  language: string | null | undefined;
  kind: string; // 'parent' | 'co_guardian' (from notify_recipients_for_parent)
  studentName: string; // raw, escaped here
  category: NotificationCategory;
  token: string | null | undefined; // null on the parent-only fallback path
}

/** Footer HTML for one recipient, appended after the (bilingual) email body. */
export function renderPrefsFooter({ language, kind, studentName, category, token }: PrefsFooterInput): string {
  const lang = toLang(language);
  const s = FOOTER_STRINGS[lang];
  const dir = lang === "ar" ? ' dir="rtl"' : "";
  const why = (kind === "co_guardian" ? s.coGuardian : s.parent).replace("{student}", escapeHtml(studentName));
  const style = "color:#9ca3af;font-size:12px;line-height:1.5;margin:16px 0 0;border-top:1px solid #e5e7eb;padding-top:12px";
  const link = (href: string, text: string) =>
    `<a href="${escapeHtml(href)}" style="color:#6b7280;text-decoration:underline">${escapeHtml(text)}</a>`;

  if (!token) {
    return `<div${dir} style="${style}"><p style="margin:0">${why}</p><p style="margin:4px 0 0">${link(`${SITE_URL}/login`, s.noToken)}</p></div>`;
  }
  return `<div${dir} style="${style}"><p style="margin:0">${why}</p>` +
    `<p style="margin:4px 0 0">${link(prefsPageUrl(token, lang, category), s.pauseThis)} · ${link(prefsPageUrl(token, lang), s.manageAll)}</p></div>`;
}
