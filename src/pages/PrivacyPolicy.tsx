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
        description="How Independent Minds EDU collects, stores, and protects family and student data in its homeschool management platform."
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
              {isHT ? "Vèsyon 1.0 — Dènye mizajou: Oktòb 2026" : "Version 1.0 — Last updated: October 2026"}
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
            <Link to="/refund" className="hover:underline" style={{ color: "#D4A017" }}>
              {isHT ? "Politik Ranbousman" : "Refund Policy"}
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
    title: "Who we are, and two things that are always true",
    content: [
      "Kolabo Services LLC (10 James Court, Glassboro, NJ 08028, USA) operates Independent Minds EDU. This policy explains what we hold, why, and what you can do about it.",
      "Two things are true of everything below: we do not sell your information, and we do not use it for advertising.",
    ],
  },
  {
    title: "What we collect about the adult who signs up",
    content: [
      "Your email address and password, to create your account and let you sign in. A display name, to show who did what inside your family. Your interface language, to show the Service and send emails in your language. Your timezone and chosen reminder hour, to send the daily reminder at the right time of day where you live.",
      "Payment records — plan, status, dates and Stripe identifiers — to run your subscription. We never see or hold your full card number; Stripe does.",
    ],
  },
  {
    title: "What we collect about the student",
    content: [
      "This is a child's information, and we keep it to the minimum the Service needs: a first name or nickname and a level or grade, to identify whose schedule is whose; a photograph if you choose to add one, which you may remove at any time; the daily plan of subjects, tasks and durations; check-ins recording what was done and when, with any note or mood; points, trophies and reward requests; and questions put to the AI tutor with its replies.",
      "We do not ask for a student's date of birth, address, phone number, school, national identifier, or health information. Please do not enter any of it.",
    ],
  },
  {
    title: "What we collect automatically",
    content: [
      "Account activity needed to run and secure the Service: sign-in times, failed sign-in attempts, technical error reports, and a log of emails we sent you and whether they were delivered. We use these to keep the Service working and to detect abuse — not to build a profile of anyone.",
      "We use the cookies needed to keep you signed in and to remember your language. We do not use advertising or tracking cookies, and we do not run third-party analytics that follow you across other websites.",
    ],
  },
  {
    title: "Our lawful basis",
    content: [
      "Where data-protection law requires us to name one: performance of a contract, to run the Service you subscribed to; consent, for a student's information, given by their parent or guardian, and for the newsletter, which you may withdraw at any time; legitimate interests, in keeping the Service secure and preventing abuse; and legal obligation, in keeping payment records as required.",
    ],
  },
  {
    title: "Children's information — a child never signs themselves up",
    content: [
      "No one under 18 can create an account on IME. A student account exists only because a parent or guardian created it for their own child, and in doing so gave consent for the information in it.",
      "This is a deliberate design choice, not only a rule. The parent holds the account, decides what goes into it, sees everything in it, and can delete it.",
    ],
  },
  {
    title: "What the parent controls",
    content: [
      "At any time, from inside the Service, a parent or guardian may see everything held about their child; correct or delete any of it, including the photograph; see and delete the child's AI tutor conversations; remove another adult's access to their child's information; delete the student account entirely, which deletes the plan, check-ins, points and tutor history; or ask us for a copy of it all by writing to support@independentmindsedu.org.",
      "We will act on a verified parent request within 30 days, and usually much sooner.",
    ],
  },
  {
    title: "We keep a child's information to a minimum",
    content: [
      "We ask for no more about a child than the Service needs. No date of birth, no address, no phone number, no school, no identification number, no health information.",
      "About a child we never: sell their information, use it for advertising, build a profile of them, show it to another family, or use it to train artificial-intelligence models.",
    ],
  },
  {
    title: "Who can see a student's information",
    content: [
      "Only the people the parent chose. The parent who owns the account sees everything. A co-guardian the parent invited sees everything in that family. A manager the parent requested, and IME approved, sees that family's schedule and check-ins. An educator the parent assigned sees only the students assigned to them. The student sees their own information only.",
      "No family can see another family's information. This is enforced in the database itself, not only in the interface.",
    ],
  },
  {
    title: "The AI tutor and a child's questions",
    content: [
      "When a student asks the AI tutor a question, that question and the context needed to answer it are sent to a third-party AI provider (currently OpenAI) to generate a reply. We do not send the student's photograph or your payment information.",
      "The provider processes it to produce the answer. Under our arrangement with them, this content is not used to train their models.",
      "If you would rather your child did not use the tutor, do not enable it for them. The rest of the Service works without it.",
    ],
  },
  {
    title: "If you believe we hold a child's information we should not",
    content: [
      "Write to support@independentmindsedu.org. If we learn we hold information about a child without a parent's or guardian's consent, we delete it.",
    ],
  },
  {
    title: "Who else is involved",
    content: [
      "We do not sell your information and we do not share it except with the companies that provide parts of the Service: Supabase, for the database, accounts and file storage, which holds everything you store in IME; Vercel, which hosts the website and receives technical request data; Stripe, which takes payments and receives your name, email and payment details — Stripe holds the card, we do not; Resend, which sends our email and receives recipient addresses and the message; OpenAI, which powers the AI tutor and receives tutor questions and the context needed to answer them; Cloudflare, for DNS and email routing; and GitHub, which stores our encrypted database backups, readable only with a private key we hold.",
      "We may also disclose information where the law requires it, to protect the safety of a child or any person, or to enforce our Terms. If the Service is ever sold or reorganised, your information may transfer with it — you would be told, and this policy would continue to apply.",
    ],
  },
  {
    title: "Where your information goes",
    content: [
      "These providers operate primarily in the United States, so your information is stored and processed there, including when you use IME from another country.",
      "If you are in the European Economic Area, the United Kingdom, or another place with similar rules, we rely on the standard safeguards those providers offer for international transfers.",
    ],
  },
  {
    title: "Email you receive, and stopping it",
    content: [
      "Account and security email — confirmation, password reset, payment notices — cannot be turned off; it is part of having an account.",
      "Daily reminders and weekly reports can be turned off in your settings.",
      "The newsletter and articles can be turned off at any time: every one carries a one-click unsubscribe, and the unsubscribe link in the email header works too. Unsubscribing never affects your account or the emails it needs to send you.",
    ],
  },
  {
    title: "Your rights",
    content: [
      "Whatever country you are in, you may see what we hold about you and your family; get a copy in a portable format; correct anything wrong; delete your family's information or any part of it; object to a use or ask us to restrict it; withdraw consent, for the newsletter or for a child's information; and complain to your national data-protection authority.",
      "Most of these you can do yourself inside the Service. For the rest, write to support@independentmindsedu.org. We reply within 30 days and we do not charge for it. We will ask you to verify your identity first — particularly for a request about a child, where we must be sure the person asking is the parent.",
    ],
  },
  {
    title: "How long we keep things",
    content: [
      "Your account and family data: while your account is open. After you close your account: 30 days, so you can change your mind or ask for an export, then deleted. Payment records: as long as tax and accounting law requires, typically seven years. Email delivery logs: 12 months. Encrypted backups: seven days, then automatically destroyed.",
      "Deleted information disappears from the Service immediately and from backups within seven days.",
    ],
  },
  {
    title: "How we protect it",
    content: [
      "Every connection uses HTTPS, and data is encrypted at rest by our database provider. Separation between families is enforced in the database itself, with row-level security, not merely hidden in the interface. Backups are encrypted before they leave the database, and can only be read with a private key held offline. Paid features and administrative actions are checked on our servers, not in your browser. Access to production systems is limited to the people who operate IME.",
      "No service can promise perfect security. If a breach affects your information, we will tell you and the relevant authority as the law requires, without undue delay.",
    ],
  },
  {
    title: "Changes to this policy",
    content: [
      "If we change this policy materially we will raise its version, publish it here, and email you at least 30 days before it takes effect.",
    ],
  },
  {
    title: "Contact",
    content: [
      "Kolabo Services LLC, 10 James Court, Glassboro, NJ 08028, USA",
      "Privacy questions and requests: support@independentmindsedu.org",
    ],
  },
];

const sectionsHT = [
  {
    title: "Kilès nou ye, ak de bagay ki toujou vre",
    content: [
      "Kolabo Services LLC (10 James Court, Glassboro, NJ 08028, USA) opere Independent Minds EDU. Politik sa a esplike sa nou kenbe, poukisa, ak sa ou ka fè sou sa.",
      "De bagay vre pou tout sa ki anba a: nou pa vann enfòmasyon w, epi nou pa itilize l pou piblisite.",
    ],
  },
  {
    title: "Sa nou kolekte sou granmoun ki enskri a",
    content: [
      "Adrès imel ou ak modpas ou, pou kreye kont ou epi pou ou ka konekte. Yon non pou afiche, pou montre kilès ki fè kisa nan fanmi an. Lang entèfas ou, pou montre Sèvis la epi voye imel nan lang ou. Fizo orè w ak lè ou chwazi pou rapèl la, pou voye rapèl chak jou a nan bon lè kote w ap viv.",
      "Dosye peman — plan, estati, dat ak idantifyan Stripe — pou fè abònman w mache. Nou pa janm wè ni kenbe nimewo konplè kat ou; se Stripe ki fè sa.",
    ],
  },
  {
    title: "Sa nou kolekte sou elèv la",
    content: [
      "Sa se enfòmasyon yon timoun, epi nou kenbe l nan minimòm Sèvis la bezwen: yon prenon oswa yon ti non ak yon nivo oswa klas, pou konnen ki orè ki pou kilès; yon foto si ou chwazi mete youn, ou ka retire l nenpòt kilè; plan chak jou a ak matyè, travay ak dire; check-in ki anrejistre sa ki fèt ak kilè, ak nenpòt nòt oswa imè; pwen, trofe ak demann rekonpans; ak kesyon yo poze AI tutor la ansanm ak repons li yo.",
      "Nou pa mande dat nesans yon elèv, adrès li, nimewo telefòn li, lekòl li, nimewo idantifikasyon nasyonal ni enfòmasyon sante. Tanpri pa antre anyen nan sa yo.",
    ],
  },
  {
    title: "Sa nou kolekte otomatikman",
    content: [
      "Aktivite kont lan nou bezwen pou fè Sèvis la mache ak pou sekirize l: lè koneksyon, tantativ koneksyon ki echwe, rapò erè teknik, ak yon jounal imel nou voye ba ou ak si yo rive. Nou itilize sa yo pou kenbe Sèvis la ap mache ak pou detekte abi — pa pou bati yon pwofil sou pèsonn.",
      "Nou itilize cookie nou bezwen pou kenbe w konekte ak pou sonje lang ou. Nou pa itilize cookie piblisite ni cookie swiv, epi nou pa fè analiz ki swiv ou sou lòt sit entènèt.",
    ],
  },
  {
    title: "Baz legal nou",
    content: [
      "Kote lwa pwoteksyon done mande nou nonmen youn: egzekisyon yon kontra, pou fè Sèvis ou abònen an mache; konsantman, pou enfòmasyon yon elèv, ke paran oswa gadyen li bay, epi pou newsletter la, ou ka retire l nenpòt kilè; enterè lejitim, pou kenbe Sèvis la an sekirite epi anpeche abi; ak obligasyon legal, pou kenbe dosye peman jan lalwa mande.",
    ],
  },
  {
    title: "Enfòmasyon timoun — yon timoun pa janm enskri tèt li",
    content: [
      "Okenn moun ki poko gen 18 an pa ka kreye yon kont sou IME. Yon kont elèv egziste sèlman paske yon paran oswa yon gadyen kreye l pou pwòp pitit li, epi lè l fè sa li bay konsantman pou enfòmasyon ki ladan l.",
      "Se yon chwa konsepsyon espre, se pa sèlman yon règ. Paran an kenbe kont lan, deside sa ki antre ladan l, wè tout sa ki ladan l, epi li ka efase l.",
    ],
  },
  {
    title: "Sa paran an kontwole",
    content: [
      "Nenpòt kilè, depi andedan Sèvis la, yon paran oswa gadyen ka wè tout sa nou kenbe sou pitit li; korije oswa efase nenpòt nan yo, foto a ladan; wè epi efase konvèsasyon AI tutor pitit la; retire aksè yon lòt granmoun sou enfòmasyon pitit li; efase kont elèv la nèt, sa ki efase plan an, check-in yo, pwen yo ak istorik tutè a; oswa mande nou yon kopi tout bagay lè l ekri support@independentmindsedu.org.",
      "N ap reponn yon demann paran nou verifye nan 30 jou, epi anjeneral byen pi vit.",
    ],
  },
  {
    title: "Nou kenbe enfòmasyon timoun nan minimòm",
    content: [
      "Nou pa mande plis sou yon timoun pase sa Sèvis la bezwen. Pa gen dat nesans, pa gen adrès, pa gen nimewo telefòn, pa gen lekòl, pa gen nimewo idantifikasyon, pa gen enfòmasyon sante.",
      "Sou yon timoun nou pa janm: vann enfòmasyon li, itilize l pou piblisite, bati yon pwofil sou li, montre l bay yon lòt fanmi, ni itilize l pou antrene modèl entèlijans atifisyèl.",
    ],
  },
  {
    title: "Kilès ki ka wè enfòmasyon yon elèv",
    content: [
      "Sèlman moun paran an chwazi. Paran ki mèt kont lan wè tout bagay. Yon co-guardian paran an envite wè tout bagay nan fanmi sa a. Yon manager paran an mande, epi IME apwouve, wè orè ak check-in fanmi sa a. Yon edikatè paran an bay yon elèv wè sèlman elèv yo ba li yo. Elèv la wè sèlman pwòp enfòmasyon pa l.",
      "Okenn fanmi pa ka wè enfòmasyon yon lòt fanmi. Se andedan database la menm sa anfòse, se pa sèlman nan entèfas la.",
    ],
  },
  {
    title: "AI tutor la ak kesyon yon timoun",
    content: [
      "Lè yon elèv poze AI tutor la yon kesyon, kesyon sa a ak kontèks li bezwen pou reponn ale jwenn yon konpayi AI deyò (kounye a OpenAI) pou jenere yon repons. Nou pa voye foto elèv la ni enfòmasyon peman w.",
      "Konpayi an trete l pou pwodui repons lan. Anba antant nou gen avèk yo, yo pa itilize kontni sa a pou antrene modèl yo.",
      "Si ou pito pitit ou pa itilize tutè a, pa aktive l pou li. Rès Sèvis la mache san li.",
    ],
  },
  {
    title: "Si ou kwè nou kenbe enfòmasyon yon timoun nou pa ta dwe genyen",
    content: [
      "Ekri support@independentmindsedu.org. Si nou aprann nou kenbe enfòmasyon sou yon timoun san konsantman yon paran oswa yon gadyen, nou efase yo.",
    ],
  },
  {
    title: "Kilès lòt moun ki enplike",
    content: [
      "Nou pa vann enfòmasyon w epi nou pa pataje yo eksepte ak konpayi ki bay pati nan Sèvis la: Supabase, pou database la, kont yo ak depo fichye, ki kenbe tout sa ou mete nan IME; Vercel, ki ebèje sit la epi resevwa done teknik demann yo; Stripe, ki pran peman epi resevwa non w, imel ou ak detay peman w — se Stripe ki kenbe kat la, se pa nou; Resend, ki voye imel nou epi resevwa adrès destinatè yo ak mesaj la; OpenAI, ki fè AI tutor la mache epi resevwa kesyon tutè yo ak kontèks pou reponn yo; Cloudflare, pou DNS ak routing imel; ak GitHub, ki konsève backup database chiffre nou yo, ki ka li sèlman ak yon kle prive nou kenbe.",
      "Nou ka divilge enfòmasyon tou kote lalwa mande sa, pou pwoteje sekirite yon timoun oswa nenpòt moun, oswa pou fè Kondisyon nou yo respekte. Si Sèvis la ta janm vann oswa reòganize, enfòmasyon w ka transfere avè l — n ap di w sa, epi politik sa a ap kontinye aplike.",
    ],
  },
  {
    title: "Kote enfòmasyon w ale",
    content: [
      "Konpayi sa yo opere sitou Ozetazini, donk nou konsève epi trete enfòmasyon w la, menm lè ou itilize IME depi yon lòt peyi.",
      "Si ou nan Espas Ekonomik Ewopeyen an, Wayòm Ini a, oswa yon lòt kote ki gen règ sanblab, nou konte sou pwoteksyon estanda konpayi sa yo ofri pou transfè entènasyonal.",
    ],
  },
  {
    title: "Imel ou resevwa, ak kijan pou rete yo",
    content: [
      "Imel kont ak sekirite — konfimasyon, reyinisyalizasyon modpas, avi peman — pa ka etenn; yo fè pati gen yon kont.",
      "Rapèl chak jou ak rapò chak semèn ka etenn nan paramèt ou.",
      "Newsletter la ak atik yo ka etenn nenpòt kilè: chak youn gen yon dezabònman an yon sèl klik, epi lyen dezabònman ki nan antèt imel la mache tou. Dezabòne pa janm afekte kont ou ni imel li bezwen voye ba ou.",
    ],
  },
  {
    title: "Dwa w",
    content: [
      "Nenpòt peyi ou ye, ou ka wè sa nou kenbe sou ou ak fanmi w; jwenn yon kopi nan yon fòma pòtab; korije nenpòt bagay ki pa kòrèk; efase enfòmasyon fanmi w oswa nenpòt pati ladan yo; opoze yon itilizasyon oswa mande nou limite l; retire konsantman, pou newsletter la oswa pou enfòmasyon yon timoun; epi fè yon plent bay otorite pwoteksyon done nan peyi w.",
      "Pifò nan sa yo ou ka fè yo ou menm andedan Sèvis la. Pou rès la, ekri support@independentmindsedu.org. Nou reponn nan 30 jou epi nou pa fè w peye pou sa. N ap mande w verifye idantite w anvan — sitou pou yon demann sou yon timoun, kote nou dwe asire nou moun k ap mande a se paran an.",
    ],
  },
  {
    title: "Konbyen tan nou kenbe bagay yo",
    content: [
      "Kont ou ak done fanmi w: pandan kont ou louvri. Apre ou fèmen kont ou: 30 jou, pou ou ka chanje lide oswa mande yon ekspòtasyon, apre sa nou efase yo. Dosye peman: osi lontan lwa taks ak kontabilite mande, anjeneral sèt an. Jounal livrezon imel: 12 mwa. Backup chiffre: sèt jou, apre sa yo detwi otomatikman.",
      "Enfòmasyon ou efase disparèt nan Sèvis la imedyatman epi nan backup yo nan sèt jou.",
    ],
  },
  {
    title: "Kijan nou pwoteje yo",
    content: [
      "Chak koneksyon pase sou HTTPS, epi konpayi database nou an chiffre done yo lè yo nan repo. Separasyon ant fanmi yo anfòse andedan database la menm, ak row-level security, se pa sèlman kache nan entèfas la. Nou chiffre backup yo anvan yo kite database la, epi yo ka li sèlman ak yon kle prive nou kenbe offline. Nou verifye feature ki peye ak aksyon administratif sou sèvè nou yo, pa nan navigatè w. Aksè sou sistèm pwodiksyon limite ak moun k ap opere IME.",
      "Okenn sèvis pa ka pwomèt sekirite pafè. Si yon vyolasyon afekte enfòmasyon w, n ap di w sa ak otorite ki konsène a jan lalwa mande, san reta.",
    ],
  },
  {
    title: "Chanjman nan politik sa a",
    content: [
      "Si nou chanje politik sa a nan yon fason enpòtan, n ap monte vèsyon l, pibliye l isit la, epi voye yon imel ba ou omwen 30 jou anvan li pran efè.",
    ],
  },
  {
    title: "Kontak",
    content: [
      "Kolabo Services LLC, 10 James Court, Glassboro, NJ 08028, USA",
      "Kesyon ak demann sou konfidansyalite: support@independentmindsedu.org",
    ],
  },
];
