import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function PrivacyPolicy() {
  const { lang } = useI18n();
  const isHT = lang === "HT";

  const sections = isHT ? sectionsHT : sectionsEN;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy — Independent Minds EDU"
        description="How Independent Minds EDU collects, stores, and protects family and student data. COPPA-compliant homeschool management."
        path="/privacy"
      />
      <header className="sticky top-0 z-50 bg-primary shadow-md">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/login" className="text-primary-foreground/70 hover:text-primary-foreground p-1" aria-label="Back to login">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-lg font-bold text-primary-foreground">
            {isHT ? "Politik Konfidansyalite" : "Privacy Policy"}
          </h1>
          <LanguageToggle variant="dark" />
        </div>
      </header>

      <main id="main-content" className="container max-w-2xl py-8 px-4 space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={28} className="text-primary" />
          <div>
            <h2 className="font-display text-2xl font-bold" style={{ color: "#1A365D" }}>
              {isHT ? "Politik Konfidansyalite" : "Privacy Policy"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isHT ? "Dènye mizajou: Mas 2026" : "Last updated: March 2026"}
            </p>
          </div>
        </div>

        {sections.map((section, i) => (
          <section key={i} className="space-y-3">
            <h3 className="font-display text-lg font-semibold" style={{ color: "#1A365D" }}>
              {i + 1}. {section.title}
            </h3>
            <div className="text-sm text-foreground/80 leading-relaxed space-y-2">
              {section.content.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </section>
        ))}

        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          <p>Independent Minds EDU — Built with Love by KòdLabo</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/terms" className="hover:underline" style={{ color: "#D4A017" }}>
              {isHT ? "Kondisyon Sèvis" : "Terms of Service"}
            </Link>
            <Link to="/login" className="hover:underline" style={{ color: "#D4A017" }}>
              {isHT ? "Konekte" : "Login"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

const sectionsEN = [
  {
    title: "Introduction",
    content: [
      "Independent Minds EDU is a bilingual homeschool management platform built by KòdLabo. This Privacy Policy explains how we collect, use, and protect your information when you use our platform at independentmindsedu.org.",
      "For questions about this policy, contact us at privacy@independentmindsedu.org.",
    ],
  },
  {
    title: "Information We Collect",
    content: [
      "Parent data: email address, display name, and language preference.",
      "Student data: name, grade level, date of birth, nationality, photo (optional), enrollment date, academic records, block completion timestamps, check-in responses (mood, focus, comments), AI tutor session inputs, and reward point transactions.",
      "Device data: IP address (for security purposes), browser type, and PWA install status.",
    ],
  },
  {
    title: "How We Use This Information",
    content: [
      "To operate the platform and deliver educational tracking services.",
      "To send Telegram and WhatsApp notifications to the registered parent about student progress, alerts, and weekly summaries.",
      "To generate AI tutor (Mr A) responses via Google Gemini. These interactions are session-based and conversation history is retained for continuity but can be cleared at any time.",
      "We do NOT sell, share, or monetize any personal data. We do NOT display advertising of any kind.",
    ],
  },
  {
    title: "Children's Privacy (COPPA)",
    content: [
      "Independent Minds EDU is directed at children as students, managed exclusively by parents or legal guardians.",
      "All student accounts are created exclusively by verified adult parents who have confirmed they are 18 years of age or older. Students cannot self-register.",
      "We do not knowingly collect personal information from any child without verifiable parental consent.",
      "Parents have the right to review, modify, and delete all data for their children at any time through the platform dashboard.",
      "To request data access or deletion, contact privacy@independentmindsedu.org.",
    ],
  },
  {
    title: "Data Sharing",
    content: [
      "We share student data only with the following services, strictly for operational purposes:",
      "• Google (Gemini AI) — for AI tutor responses, on a session-only basis",
      "• Lovable Cloud — for infrastructure hosting and database services",
      "• Telegram — for notification delivery to parents",
      "• Twilio — for WhatsApp notifications when configured by the parent",
      "We do not share data with data brokers, advertisers, or third-party analytics providers.",
    ],
  },
  {
    title: "Data Retention",
    content: [
      "Active accounts: data is retained for the life of the account.",
      "Accounts inactive for 18 months receive a re-engagement notification.",
      "Accounts inactive for 24 months receive a deletion warning with a 30-day grace period.",
      "Parents can delete individual students or their entire account at any time via the dashboard settings.",
    ],
  },
  {
    title: "Security",
    content: [
      "PostgreSQL database with Row-Level Security (RLS) enabled on all tables.",
      "All data encrypted in transit via HTTPS/TLS.",
      "JWT-based session management with automatic token refresh.",
      "No plaintext storage of sensitive credentials. Telegram bot tokens are encrypted with AES-256-GCM before storage.",
    ],
  },
  {
    title: "Your Rights",
    content: [
      "Access — Parents can view all student data through the dashboard.",
      "Correction — Parents can edit all student information at any time.",
      "Deletion — Parents can delete individual students or their entire account.",
      "Portability — Contact privacy@independentmindsedu.org for a data export.",
    ],
  },
  {
    title: "Changes to This Policy",
    content: [
      "We will notify registered parents by email of any material changes to this policy before they take effect.",
    ],
  },
  {
    title: "Contact",
    content: [
      "Email: privacy@independentmindsedu.org",
      "Website: independentmindsedu.org",
    ],
  },
];

const sectionsHT = [
  {
    title: "Entwodiksyon",
    content: [
      "Independent Minds EDU se yon platfòm jesyon lekòl kay bileng ki te bati pa KòdLabo. Politik Konfidansyalite sa a eksplike kijan nou kolekte, itilize, epi pwoteje enfòmasyon ou lè ou itilize platfòm nou an sou independentmindsedu.org.",
      "Pou kesyon sou politik sa a, kontakte nou nan privacy@independentmindsedu.org.",
    ],
  },
  {
    title: "Enfòmasyon Nou Kolekte",
    content: [
      "Done paran: adrès imèl, non afichaj, ak preferans lang.",
      "Done elèv: non, nivo klas, dat nesans, nasyonalite, foto (opsyonèl), dat enskripsyon, dosye akademik, lè fini blòk, repons tcheke (imosyon, konsantrasyon, kòmantè), antre sesyon AI tutor, ak tranzaksyon pwen rekonpans.",
      "Done aparèy: adrès IP (pou sekirite), tip navigatè, ak estati enstalasyon PWA.",
    ],
  },
  {
    title: "Kijan Nou Itilize Enfòmasyon Sa a",
    content: [
      "Pou opere platfòm nan epi bay sèvis swivi edikasyon.",
      "Pou voye notifikasyon Telegram ak WhatsApp bay paran ki enskri a konsènan pwogrè elèv, alèt, ak rezime chak semèn.",
      "Pou jenere repons AI tutor (Mr A) atravè Google Gemini. Entèraksyon sa yo baze sou sesyon epi istwa konvèsasyon kenbe pou kontinyite men ou ka efase li nenpòt ki lè.",
      "Nou PA vann, pataje, oswa monetize okenn done pèsonèl. Nou PA afiche piblisite.",
    ],
  },
  {
    title: "Konfidansyalite Timoun (COPPA)",
    content: [
      "Independent Minds EDU vize timoun kòm elèv, ki jere eksklizivman pa paran oswa gadyen legal.",
      "Tout kont elèv kreye eksklizivman pa paran adilt ki verifye ki gen 18 an oswa plis. Elèv pa ka oto-enskri.",
      "Nou pa kolekte enfòmasyon pèsonèl nan men okenn timoun san konsantman paran verifye.",
      "Paran gen dwa revize, modifye, epi efase tout done pou pitit yo nenpòt ki lè atravè tablo bò platfòm nan.",
      "Pou mande aksè done oswa sipresyon, kontakte privacy@independentmindsedu.org.",
    ],
  },
  {
    title: "Pataje Done",
    content: [
      "Nou pataje done elèv sèlman ak sèvis sa yo, strik pou rezon operasyonèl:",
      "• Google (Gemini AI) — pou repons AI tutor, sou baz sesyon sèlman",
      "• Lovable Cloud — pou èbèjman enfrastrikti ak sèvis baz done",
      "• Telegram — pou livrezon notifikasyon bay paran",
      "• Twilio — pou notifikasyon WhatsApp lè paran konfigire li",
      "Nou pa pataje done ak koutye done, piblisite, oswa founisè analiz tyès pati.",
    ],
  },
  {
    title: "Retansyon Done",
    content: [
      "Kont aktif: done kenbe pou tout vi kont lan.",
      "Kont inaktif pou 18 mwa resevwa yon notifikasyon re-angajman.",
      "Kont inaktif pou 24 mwa resevwa yon avètisman sipresyon ak yon peryòd gras 30 jou.",
      "Paran ka efase elèv endividyèl oswa tout kont yo nenpòt ki lè atravè paramèt tablo bò a.",
    ],
  },
  {
    title: "Sekirite",
    content: [
      "Baz done PostgreSQL ak Sekirite Nivo Ranje (RLS) aktive sou tout tab.",
      "Tout done ankripte an transpo atravè HTTPS/TLS.",
      "Jesyon sesyon baze sou JWT ak rafrechisman otomatik token.",
      "Pa gen estokaj tèks klè pou done sansib. Token bot Telegram ankripte ak AES-256-GCM anvan estokaj.",
    ],
  },
  {
    title: "Dwa Ou",
    content: [
      "Aksè — Paran ka wè tout done elèv atravè tablo bò a.",
      "Koreksyon — Paran ka modifye tout enfòmasyon elèv nenpòt ki lè.",
      "Sipresyon — Paran ka efase elèv endividyèl oswa tout kont yo.",
      "Pòtabilite — Kontakte privacy@independentmindsedu.org pou yon ekspòtasyon done.",
    ],
  },
  {
    title: "Chanjman nan Politik Sa a",
    content: [
      "N ap notifye paran ki enskri pa imèl pou nenpòt chanjman enpòtan nan politik sa a anvan yo antre an vigè.",
    ],
  },
  {
    title: "Kontak",
    content: [
      "Imèl: privacy@independentmindsedu.org",
      "Sit wèb: independentmindsedu.org",
    ],
  },
];
