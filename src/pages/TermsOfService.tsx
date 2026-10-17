import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function TermsOfService() {
  const { lang } = useI18n();
  const isHT = lang === "HT";
  const sections = isHT ? sectionsHT : sectionsEN;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service — Independent Minds EDU"
        description="Terms and conditions for using Independent Minds EDU, the multilingual homeschool management platform for families and educators."
        path="/terms"
      />
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
            <Link to="/privacy" className="hover:underline" style={{ color: "#D4A017" }}>
              {isHT ? "Politik Konfidansyalite" : "Privacy Policy"}
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
    title: "Who you are agreeing with",
    content: [
      "These Terms are an agreement between you and Kolabo Services LLC, a New Jersey limited liability company of [ENTITY ADDRESS] (\"IME\", \"we\", \"us\"), which operates Independent Minds EDU at www.independentmindsedu.org (the \"Service\").",
      "By creating an account or using the Service you accept these Terms. If you do not accept them, do not use the Service.",
    ],
  },
  {
    title: "You must be an adult",
    content: [
      "You must be at least 18 years old, and legally able to enter into a contract, to create an account. The Service is sold to parents, guardians and other adults responsible for a child's education. We do not knowingly permit anyone under 18 to create an account.",
      "If we learn that an account was created by a minor, we will close it.",
    ],
  },
  {
    title: "Student accounts",
    content: [
      "A student account is created by a parent or guardian for a child in their care. It is not created by the child.",
      "When you create a student account you confirm that you are the child's parent or legal guardian, or that you have that person's permission; that you consent, on the child's behalf, to IME processing their information as described in the Privacy Policy; and that you are responsible for what is entered into that account and for the child's use of the Service.",
      "You may delete a student account at any time. Deleting it removes that student's plan, check-ins, points and tutor history.",
    ],
  },
  {
    title: "Other adults you invite",
    content: [
      "The Service lets you share access to your family's information with a co-guardian, who can see and change nearly everything in your family except billing; a manager, who oversees your family's schedule and check-ins but cannot change billing or remove a student, and whose access is approved by IME before it takes effect; and an educator, who sees only the students assigned to them.",
      "You choose who to invite, and you may remove their access at any time. You are responsible for who you give access to. Access is limited to your own family; no one you invite can see another family's information.",
    ],
  },
  {
    title: "Your account",
    content: [
      "Keep your password confidential, and tell us promptly at support@independentmindsedu.org if you believe someone else has used your account. You are responsible for activity under your account.",
      "One account belongs to one adult. Do not share login credentials with people outside your household — invite them properly instead, using the roles above.",
    ],
  },
  {
    title: "Free trial",
    content: [
      "New accounts receive a 14-day free trial, starting when you confirm your email address. No payment is taken during the trial. If you do not subscribe before it ends, your account continues to exist but paid features stop working. Your data is not deleted when a trial ends.",
    ],
  },
  {
    title: "Plans and payment",
    content: [
      "The Service is sold on monthly plans. Current plans, prices and what each includes are shown at www.independentmindsedu.org/pricing, which forms part of these Terms. Plans differ in the number of students, the number of AI tutor questions per month, and which features are available.",
      "You may change plan at any time. An upgrade takes effect immediately; a downgrade takes effect at the start of your next billing period. If a downgrade would put you over the new plan's limits, existing data is kept and remains visible, but you will need to reduce usage to the new limit before you can add more.",
      "Payments are processed by Stripe. We do not receive or store your full card number. Prices are in US dollars; your bank may add currency conversion or foreign transaction fees, which are not ours and which we do not receive.",
      "Your subscription renews automatically each month on the same day, at the then-current price, until you cancel. If a payment fails, we may retry it and will notify you, and paid features may be suspended until payment succeeds. You are responsible for any taxes that apply where you live, unless we are required to collect them.",
    ],
  },
  {
    title: "Price changes",
    content: [
      "We may change prices. If a change affects your existing subscription, we will give you at least 30 days' notice by email before it takes effect, and you may cancel before then. Continuing after the notice period means you accept the new price.",
    ],
  },
  {
    title: "Cancelling",
    content: [
      "You may cancel at any time from your billing page. Cancelling stops the next charge; it does not shorten the period you have already paid for, and you keep access until the end of that period.",
      "After cancellation your account remains, and your family's data remains, with paid features switched off. You may resubscribe at any time. To have your data deleted instead, see the Privacy Policy. Refunds are covered by the Refund Policy.",
    ],
  },
  {
    title: "Your family's content",
    content: [
      "Everything you and your family put into IME — plans, tasks, notes, check-ins, photographs, rewards — belongs to you. We do not claim ownership of it.",
      "You grant us only the permission we need to run the Service: to store your content, display it to you and to the people you have given access, include it in the emails you have asked for, and back it up. We do not sell it, we do not use it for advertising, and we do not use your family's content to train artificial-intelligence models.",
    ],
  },
  {
    title: "What the Service is not",
    content: [
      "IME is not a school and does not provide education. IME does not supply curriculum, lessons or teaching materials — you decide what your child studies.",
      "IME does not grant credits, grades, diplomas or accreditation, and is not recognised by any education authority.",
      "IME does not determine whether you comply with the homeschooling law where you live. Those requirements vary by country, state and province, they are your responsibility, and records kept in IME may or may not satisfy them. Check with your own authority.",
      "IME is a tool for organising and recording the schooling you provide. Nothing in it is educational, legal or professional advice.",
    ],
  },
  {
    title: "The AI tutor",
    content: [
      "The Service includes an AI tutor (\"Mr A\"). It is powered by a third-party AI provider; questions put to it, and the context needed to answer, are sent to that provider. See the Privacy Policy.",
      "It can be wrong. AI answers may be inaccurate, incomplete or out of date — check anything that matters before relying on it. It is not a teacher, tutor, counsellor or any kind of professional, and gives no medical, psychological, legal or financial advice.",
      "Use is limited per month according to your plan. Because a child may use it, supervise that use as you would any other tool. We filter for safety but cannot guarantee every response is appropriate. If you see a response that concerns you, tell us at support@independentmindsedu.org.",
    ],
  },
  {
    title: "Acceptable use",
    content: [
      "You agree not to give false information, or claim to be a parent or guardian of a child who is not in your care; use the Service to access another family's information, or try to get around the permissions system; upload unlawful content, or photographs of children who are not in your care; resell, sublicense or redistribute the Service, or share one account across unrelated households; attempt to break, overload, scrape or reverse-engineer the Service, or probe its security; or use the Service to harass, exploit or harm a child in any way.",
      "We may suspend or close an account that breaks these rules. Where a child may be at risk, we may act immediately and may be required to report it.",
    ],
  },
  {
    title: "Availability, and keeping your own copy",
    content: [
      "We work to keep the Service running, but we do not promise it will be uninterrupted or error-free. We may take it down for maintenance, and we may change or remove features. If we remove something you are paying for, you may cancel and ask for a refund of the unused part of your period under the Refund Policy.",
      "We take daily encrypted backups. This is our protection against our own failures — it is not a records service for you. If the record of your child's schooling matters to you legally or personally, export or print what you need and keep your own copy.",
    ],
  },
  {
    title: "Disclaimer and limitation of liability",
    content: [
      "To the fullest extent permitted by law, the Service is provided \"as is\" and \"as available\", without warranties of any kind, express or implied, including fitness for a particular purpose and non-infringement. We do not warrant that the Service will meet your requirements, that AI responses will be accurate, or that records kept in it will satisfy any legal obligation.",
      "To the fullest extent permitted by law, we are not liable for indirect, incidental, special or consequential damages, or for lost profits, lost data or lost opportunity. Our total liability to you, for any claim, is limited to the amount you paid us in the 12 months before the claim arose.",
      "Some jurisdictions do not allow these limits. Where that is so, they apply only as far as the law permits, and nothing here excludes liability that cannot lawfully be excluded — including liability for death or personal injury caused by negligence, or for fraud.",
    ],
  },
  {
    title: "Suspension and termination",
    content: [
      "You may close your account at any time.",
      "We may suspend or close an account that breaks these Terms, that fails to pay, or where we are required to by law. Except where the breach is serious or a child may be at risk, we will tell you first and give you a chance to put it right. If we close your account without cause, we refund the unused part of your period.",
      "On closure you may request an export of your family's data within 30 days. After that it is deleted according to the Privacy Policy.",
    ],
  },
  {
    title: "Changes to these Terms",
    content: [
      "We may update these Terms. For material changes we will give at least 30 days' notice by email and raise the version number. Continuing to use the Service after the notice period means you accept the updated Terms. If you do not, cancel before they take effect.",
    ],
  },
  {
    title: "Governing law",
    content: [
      "These Terms are governed by the laws of the State of New Jersey, USA, without regard to conflict-of-law rules, and the courts there have exclusive jurisdiction.",
      "If you are a consumer in a country whose law gives you rights that cannot be removed by contract, those rights still apply and nothing here takes them away.",
    ],
  },
  {
    title: "General",
    content: [
      "If a provision is held unenforceable, the rest remains in force. Our not enforcing a provision is not a waiver of it. You may not transfer your rights under these Terms; we may transfer ours if the Service is sold or reorganised, on notice to you.",
      "These Terms, the Privacy Policy, the Refund Policy and the pricing page are the entire agreement between us.",
    ],
  },
  {
    title: "Contact",
    content: [
      "Kolabo Services LLC, [ENTITY ADDRESS]",
      "support@independentmindsedu.org — www.independentmindsedu.org",
    ],
  },
];

const sectionsHT = [
  {
    title: "Ak kilès ou ap fè antant lan",
    content: [
      "Kondisyon sa yo se yon antant ant ou ak Kolabo Services LLC, yon konpayi ki anrejistre nan New Jersey, ki chita nan [ADRÈS KONPAYI A] (\"IME\", \"nou\"), ki opere Independent Minds EDU sou www.independentmindsedu.org (\"Sèvis la\").",
      "Lè ou kreye yon kont oswa ou itilize Sèvis la, ou aksepte Kondisyon sa yo. Si ou pa aksepte yo, pa itilize Sèvis la.",
    ],
  },
  {
    title: "Ou dwe yon granmoun",
    content: [
      "Ou dwe gen omwen 18 an, epi ou dwe gen dwa legal pou siyen yon kontra, pou kreye yon kont. Nou vann Sèvis la bay paran, gadyen ak lòt granmoun ki responsab edikasyon yon timoun. Nou pa pèmèt okenn moun ki poko gen 18 an kreye yon kont.",
      "Si nou aprann se yon minè ki te kreye yon kont, n ap fèmen l.",
    ],
  },
  {
    title: "Kont elèv yo",
    content: [
      "Se yon paran oswa yon gadyen ki kreye yon kont elèv pou yon timoun ki anba responsablite l. Se pa timoun nan ki kreye l.",
      "Lè ou kreye yon kont elèv, ou konfime ou se paran oswa gadyen legal timoun nan, oswa ou gen pèmisyon moun sa a; ou bay konsantman, nan non timoun nan, pou IME trete enfòmasyon li jan Politik Konfidansyalite a esplike l; epi ou responsab pou sa ki antre nan kont sa a ak pou fason timoun nan itilize Sèvis la.",
      "Ou ka efase yon kont elèv nenpòt kilè. Lè ou efase l, sa retire plan elèv la, check-in li yo, pwen li yo ak istorik tutè a.",
    ],
  },
  {
    title: "Lòt granmoun ou envite",
    content: [
      "Sèvis la pèmèt ou pataje aksè sou enfòmasyon fanmi w ak yon co-guardian, ki ka wè epi chanje prèske tout bagay nan fanmi an eksepte fakti; yon manager, ki siveye orè ak check-in fanmi an men ki pa ka chanje fakti ni retire yon elèv, epi ki gen aksè sèlman apre IME apwouve l; ak yon edikatè, ki wè sèlman elèv yo ba li.",
      "Se ou ki chwazi kilès pou envite, epi ou ka retire aksè yo nenpòt kilè. Ou responsab pou moun ou bay aksè. Aksè a limite ak pwòp fanmi pa w; okenn moun ou envite pa ka wè enfòmasyon yon lòt fanmi.",
    ],
  },
  {
    title: "Kont ou",
    content: [
      "Kenbe modpas ou konfidansyèl, epi fè nou konnen touswit nan support@independentmindsedu.org si ou kwè yon lòt moun sèvi ak kont ou. Ou responsab pou tout aktivite ki fèt anba kont ou.",
      "Yon kont se pou yon sèl granmoun. Pa pataje enfòmasyon koneksyon w ak moun ki pa nan kay ou — envite yo kòrèkteman pito, ak wòl ki anwo yo.",
    ],
  },
  {
    title: "Peryòd esè gratis",
    content: [
      "Chak nouvo kont resevwa 14 jou esè gratis, ki kòmanse lè ou konfime adrès imel ou. Nou pa pran okenn peman pandan peryòd esè a. Si ou pa abònen anvan li fini, kont ou rete la men feature ki peye yo sispann mache. Nou pa efase done w lè yon peryòd esè fini.",
    ],
  },
  {
    title: "Plan ak peman",
    content: [
      "Nou vann Sèvis la sou plan chak mwa. Plan yo, pri yo ak sa chak gen ladan parèt sou www.independentmindsedu.org/pricing, ki fè pati Kondisyon sa yo. Plan yo diferan sou kantite elèv, kantite kesyon AI tutor pa mwa, ak ki feature ki disponib.",
      "Ou ka chanje plan nenpòt kilè. Yon upgrade pran efè imedyatman; yon downgrade pran efè lè pwochen peryòd fakti w kòmanse. Si yon downgrade ta mete w pi wo pase limit nouvo plan an, nou kenbe done ki deja la epi yo rete vizib, men w ap bezwen desann anba limit la anvan ou ka ajoute lòt.",
      "Se Stripe ki trete peman yo. Nou pa resevwa ni konsève nimewo konplè kat ou. Pri yo an dola ameriken; bank ou ka ajoute frè konvèsyon lajan oswa frè tranzaksyon etranje, ki pa pou nou epi nou pa resevwa yo.",
      "Abònman w renouvle otomatikman chak mwa menm jou a, sou pri ki aplike lè sa a, jiskaske ou anile. Si yon peman echwe, nou ka eseye l ankò epi n ap fè w konnen, epi feature ki peye yo ka sispann jiskaske peman an pase. Ou responsab pou nenpòt taks ki aplike kote w ap viv, sof si lalwa mande nou kolekte yo.",
    ],
  },
  {
    title: "Chanjman pri",
    content: [
      "Nou ka chanje pri. Si yon chanjman afekte abònman ou genyen deja, n ap ba w omwen 30 jou avi pa imel anvan li pran efè, epi ou ka anile anvan sa. Si ou kontinye apre peryòd avi a, sa vle di ou aksepte nouvo pri a.",
    ],
  },
  {
    title: "Anile",
    content: [
      "Ou ka anile nenpòt kilè sou paj fakti w. Anile rete pwochen chaj la; li pa koupe peryòd ou deja peye a, epi ou kenbe aksè jiska fen peryòd sa a.",
      "Apre ou anile, kont ou rete, done fanmi w rete, ak feature ki peye yo etenn. Ou ka reabònen nenpòt kilè. Si ou pito nou efase done w, gade Politik Konfidansyalite a. Politik Ranbousman an kouvri ranbousman.",
    ],
  },
  {
    title: "Kontni fanmi w",
    content: [
      "Tout sa ou ak fanmi w mete nan IME — plan, travay, nòt, check-in, foto, rekonpans — se pou ou. Nou pa reklame pwopriyete sou yo.",
      "Ou ba nou sèlman pèmisyon nou bezwen pou fè Sèvis la mache: konsève kontni w, montre l ba ou ak bay moun ou bay aksè, mete l nan imel ou mande yo, epi fè backup li. Nou pa vann li, nou pa itilize l pou piblisite, epi nou pa itilize kontni fanmi w pou antrene modèl entèlijans atifisyèl.",
    ],
  },
  {
    title: "Sa Sèvis la pa ye",
    content: [
      "IME se pa yon lekòl epi li pa bay edikasyon. IME pa bay kourikoulòm, leson ni materyèl ansèyman — se ou ki deside sa pitit ou ap etidye.",
      "IME pa bay kredi, nòt, diplòm ni akreditasyon, epi okenn otorite edikasyon pa rekonèt li.",
      "IME pa detèmine si ou respekte lwa sou lekòl lakay kote w ap viv. Egzijans sa yo diferan selon peyi, eta ak pwovens, se responsablite w, epi dosye ou kenbe nan IME ka satisfè yo oswa ka pa satisfè yo. Tcheke ak pwòp otorite pa w.",
      "IME se yon zouti pou òganize epi anrejistre lekòl ou menm ap bay la. Anyen ladan l se pa konsèy edikasyonèl, legal ni pwofesyonèl.",
    ],
  },
  {
    title: "AI tutor la",
    content: [
      "Sèvis la gen yon AI tutor (\"Mr A\"). Se yon konpayi AI deyò ki fè l mache; kesyon yo poze l, ak kontèks li bezwen pou reponn, ale jwenn konpayi sa a. Gade Politik Konfidansyalite a.",
      "Li ka bay move repons. Repons AI ka pa egzak, ka pa konplè oswa ka depase — verifye tout sa ki enpòtan anvan ou konte sou yo. Li pa yon pwofesè, yon tutè, yon konseye ni okenn kalite pwofesyonèl, epi li pa bay konsèy medikal, sikolojik, legal ni finansye.",
      "Itilizasyon an limite chak mwa selon plan ou. Paske yon timoun ka sèvi avè l, siveye itilizasyon an menm jan ou ta fè pou nenpòt lòt zouti. Nou filtre pou sekirite men nou pa ka garanti chak repons apwopriye. Si ou wè yon repons ki enkyete w, di nou l nan support@independentmindsedu.org.",
    ],
  },
  {
    title: "Itilizasyon akseptab",
    content: [
      "Ou dakò pou ou pa bay fo enfòmasyon, ni pretann ou se paran oswa gadyen yon timoun ki pa anba responsablite w; itilize Sèvis la pou jwenn enfòmasyon yon lòt fanmi, oswa eseye kontoune sistèm pèmisyon an; mete kontni ilegal, oswa foto timoun ki pa anba responsablite w; revann, soulisansye oswa redistribye Sèvis la, oswa pataje yon sèl kont ant kay ki pa gen rapò; eseye kraze, chaje twòp, grate oswa demonte Sèvis la, oswa teste sekirite l; ni itilize Sèvis la pou anmède, eksplwate oswa fè yon timoun mal nan okenn fason.",
      "Nou ka sispann oswa fèmen yon kont ki vyole règ sa yo. Kote yon timoun ka an danje, nou ka aji imedyatman epi lalwa ka mande nou rapòte sa.",
    ],
  },
  {
    title: "Disponiblite, epi kenbe pwòp kopi pa w",
    content: [
      "N ap travay pou Sèvis la rete ap mache, men nou pa pwomèt li p ap janm koupe ni p ap gen erè. Nou ka etenn li pou antretyen, epi nou ka chanje oswa retire feature. Si nou retire yon bagay ou ap peye pou li, ou ka anile epi mande yon ranbousman pou pati peryòd ou pa itilize a, anba Politik Ranbousman an.",
      "Nou fè backup chiffre chak jou. Se pwoteksyon nou kont pwòp erè pa nou — se pa yon sèvis achiv pou ou. Si dosye lekòl pitit ou enpòtan pou ou sou plan legal oswa pèsonèl, ekspòte oswa enprime sa w bezwen epi kenbe pwòp kopi pa w.",
    ],
  },
  {
    title: "Demanti ak limit responsablite",
    content: [
      "Nan limit lalwa pèmèt, nou bay Sèvis la \"jan li ye\" epi \"jan li disponib\", san okenn garanti, ni eksprime ni enplisit, ki gen ladan adaptasyon pou yon rezon patikilye. Nou pa garanti Sèvis la ap satisfè egzijans ou, ni repons AI yo ap egzak, ni dosye ou kenbe ladan l ap satisfè okenn obligasyon legal.",
      "Nan limit lalwa pèmèt, nou pa responsab pou domaj endirèk, ensidantèl, espesyal ni konsekan, ni pou pwofi, done oswa opòtinite ou pèdi. Tout responsablite nou anvè w, pou nenpòt reklamasyon, limite ak kantite lajan ou te peye nou nan 12 mwa anvan reklamasyon an.",
      "Gen jiridiksyon ki pa pèmèt limit sa yo. Kote se konsa, yo aplike sèlman jan lalwa pèmèt, epi anyen isit la pa retire responsablite lalwa pa pèmèt retire — ki gen ladan responsablite pou lanmò oswa blesi fizik neglijans lakòz, oswa pou fwod.",
    ],
  },
  {
    title: "Sispansyon ak fèmen kont",
    content: [
      "Ou ka fèmen kont ou nenpòt kilè.",
      "Nou ka sispann oswa fèmen yon kont ki vyole Kondisyon sa yo, ki pa peye, oswa kote lalwa mande nou fè l. Eksepte lè vyolasyon an grav oswa yon timoun ka an danje, n ap di w sa anvan epi ba w chans korije l. Si nou fèmen kont ou san rezon, nou ranbouse pati peryòd ou pa itilize a.",
      "Lè kont lan fèmen, ou ka mande yon ekspòtasyon done fanmi w nan 30 jou. Apre sa nou efase yo selon Politik Konfidansyalite a.",
    ],
  },
  {
    title: "Chanjman nan Kondisyon sa yo",
    content: [
      "Nou ka mete Kondisyon sa yo ajou. Pou chanjman enpòtan, n ap bay omwen 30 jou avi pa imel epi monte nimewo vèsyon an. Si ou kontinye itilize Sèvis la apre peryòd avi a, sa vle di ou aksepte nouvo Kondisyon yo. Si ou pa aksepte yo, anile anvan yo pran efè.",
    ],
  },
  {
    title: "Lwa ki gouvène",
    content: [
      "Se lwa Eta New Jersey, Etazini, ki gouvène Kondisyon sa yo, san konsiderasyon pou règ konfli lwa, epi se tribinal ki la yo ki gen jiridiksyon eksklizif.",
      "Si ou se yon konsomatè nan yon peyi kote lalwa ba w dwa yon kontra pa ka retire, dwa sa yo rete aplikab epi anyen isit la pa retire yo.",
    ],
  },
  {
    title: "Jeneral",
    content: [
      "Si yon dispozisyon pa ka aplike, rès la rete anvigè. Lè nou pa fè respekte yon dispozisyon, sa pa vle di nou abandone l. Ou pa ka transfere dwa w anba Kondisyon sa yo; nou ka transfere pa nou si Sèvis la vann oswa reòganize, ak yon avi ba ou.",
      "Kondisyon sa yo, Politik Konfidansyalite a, Politik Ranbousman an ak paj pri a se tout antant lan ant nou.",
    ],
  },
  {
    title: "Kontak",
    content: [
      "Kolabo Services LLC, [ADRÈS KONPAYI A]",
      "support@independentmindsedu.org — www.independentmindsedu.org",
    ],
  },
];
