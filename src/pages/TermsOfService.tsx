import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
  const { lang } = useI18n();
  const isHT = lang === "HT";
  const sections = isHT ? sectionsHT : sectionsEN;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-primary shadow-md">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/login" className="text-primary-foreground/70 hover:text-primary-foreground p-1" aria-label="Back to login">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-lg font-bold text-primary-foreground">
            {isHT ? "Kondisyon Sèvis" : "Terms of Service"}
          </h1>
          <LanguageToggle variant="dark" />
        </div>
      </header>

      <main id="main-content" className="container max-w-2xl py-8 px-4 space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <FileText size={28} className="text-primary" />
          <div>
            <h2 className="font-display text-2xl font-bold" style={{ color: "#1A365D" }}>
              {isHT ? "Kondisyon Sèvis" : "Terms of Service"}
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
          <p>Independent Minds EDU — Built by Dany Augustin</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/privacy" className="hover:underline" style={{ color: "#D4A017" }}>
              {isHT ? "Politik Konfidansyalite" : "Privacy Policy"}
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
  { title: "Acceptance of Terms", content: ["By accessing or using Independent Minds EDU, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform."] },
  { title: "Eligibility", content: ["You must be 18 years of age or older to register as a parent on this platform. By registering, you confirm that you are the parent or legal guardian of any students you manage."] },
  { title: "Account Responsibilities", content: ["You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activities that occur under your account. Notify us immediately at legal@independentmindsedu.com if you suspect unauthorized access."] },
  { title: "Acceptable Use", content: ["Independent Minds EDU is designed exclusively for private family educational use — managing homeschool schedules, tracking student progress, and facilitating learning.", "Independent Minds EDU is designed for private family use. It is not a school records system under FERPA. If you represent an institution receiving federal funding, contact legal@independentmindsedu.com before use.", "You agree not to use the platform for any unlawful purpose, to upload harmful content, or to attempt to gain unauthorized access to other users' data."] },
  { title: "Student Data", content: ["Parents are solely responsible for the accuracy of student data entered. Parents may add, edit, or delete student records at any time. All student data is subject to our Privacy Policy."] },
  { title: "AI Tutor Disclaimer", content: ["Mr A is an AI-powered study assistant. It is not a substitute for qualified educators, tutors, or professional instruction. AI responses may contain errors or inaccuracies. Parents and students should verify important information independently. The AI tutor is designed as a supplementary learning aid only."] },
  { title: "Intellectual Property", content: ["Independent Minds EDU, including all code, design, content, and branding, is owned by Dany Augustin. You may not copy, modify, distribute, or create derivative works from the platform without prior written consent."] },
  { title: "Limitation of Liability", content: ["Independent Minds EDU is provided \"as is\" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability is limited to the amount you have paid for the service, if any."] },
  { title: "Termination", content: ["We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time through the platform settings. Upon deletion, all associated data will be permanently removed."] },
  { title: "Changes", content: ["We may update these Terms of Service from time to time. We will notify registered users of material changes by email. Continued use after changes constitutes acceptance."] },
  { title: "Contact", content: ["For legal inquiries: legal@independentmindsedu.com", "Website: independentmindsedu.com"] },
];

const sectionsHT = [
  { title: "Akseptasyon Kondisyon", content: ["Lè ou jwenn aksè oswa itilize Independent Minds EDU, ou dakò pou respekte Kondisyon Sèvis sa yo. Si ou pa dakò, pa itilize platfòm nan."] },
  { title: "Elijibilite", content: ["Ou dwe gen 18 an oswa plis pou enskri kòm paran sou platfòm sa a. Lè ou enskri, ou konfime ke ou se paran oswa gadyen legal nenpòt elèv ou jere."] },
  { title: "Responsablite Kont", content: ["Ou responsab pou kenbe konfidansyalite enfòmasyon koneksyon kont ou. Ou responsab pou tout aktivite ki fèt anba kont ou. Notifye nou imedyatman nan legal@independentmindsedu.com si ou sispèk aksè san otorizasyon."] },
  { title: "Itilizasyon Akseptab", content: ["Independent Minds EDU fèt eksklizivman pou itilizasyon edikasyon familyal prive — jere orè lekòl kay, swiv pwogrè elèv, epi fasilite aprantisaj.", "Independent Minds EDU fèt pou itilizasyon familyal prive. Li pa yon sistèm dosye lekòl anba FERPA. Si ou reprezante yon enstitisyon ki resevwa finansman federal, kontakte legal@independentmindsedu.com anvan itilizasyon.", "Ou dakò pou pa itilize platfòm nan pou okenn objektif ilegal, pou telechaje kontni danjere, oswa pou eseye jwenn aksè san otorizasyon nan done lòt itilizatè."] },
  { title: "Done Elèv", content: ["Paran yo sèl responsab pou presizyon done elèv ki antre. Paran yo ka ajoute, modifye, oswa efase dosye elèv nenpòt ki lè. Tout done elèv sijè a Politik Konfidansyalite nou an."] },
  { title: "Demanti AI Tutor", content: ["Mr A se yon asistan etid ki alimante pa AI. Li pa yon ranplasman pou edikasyon kalifye, tutè, oswa enstriksyon pwofesyonèl. Repons AI ka gen erè oswa enpresizyon. Paran ak elèv ta dwe verifye enfòmasyon enpòtan endependamman. AI tutor la fèt kòm yon èd aprantisaj siplemantè sèlman."] },
  { title: "Pwopriyete Entelektyèl", content: ["Independent Minds EDU, ki gen ladan tout kòd, konsepsyon, kontni, ak mak, se pwopriyete Dany Augustin. Ou pa ka kopye, modifye, distribye, oswa kreye travay derive soti nan platfòm nan san konsantman ekri alavans."] },
  { title: "Limitasyon Responsablite", content: ["Independent Minds EDU bay \"jan li ye\" san garanti okenn kalite. Nou pa responsab pou okenn domaj endirèk, ensidantèl, oswa konsekans ki soti nan itilizasyon ou nan platfòm nan."] },
  { title: "Fèmen Kont", content: ["Nou rezève dwa pou sispann oswa fèmen kont ki vyole kondisyon sa yo. Ou ka efase kont ou nenpòt ki lè atravè paramèt platfòm nan. Apre sipresyon, tout done ki asosye ap retire pèmananman."] },
  { title: "Chanjman", content: ["Nou ka mete Kondisyon Sèvis sa yo ajou tanzantan. N ap notifye itilizatè ki enskri pou chanjman enpòtan pa imèl. Itilizasyon kontinyèl apre chanjman konstitye akseptasyon."] },
  { title: "Kontak", content: ["Pou demann legal: legal@independentmindsedu.com", "Sit wèb: independentmindsedu.com"] },
];
