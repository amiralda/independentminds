import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Link } from "react-router-dom";
import { ArrowLeft, Receipt } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function RefundPolicy() {
  const { t, lang } = useI18n();
  const isHT = lang === "HT";
  const sections = isHT ? sectionsHT : sectionsEN;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t("refund.title")} — Independent Minds EDU`}
        description={t("refund.description")}
        path="/refund"
      />
      <header className="sticky top-0 z-50 bg-primary shadow-md">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/login" className="text-primary-foreground/70 hover:text-primary-foreground p-1" aria-label="Back to login">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-lg font-bold text-primary-foreground">
            {t("refund.title")}
          </h1>
          <LanguageToggle variant="dark" />
        </div>
      </header>

      <main id="main-content" className="container max-w-2xl py-8 px-4 space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <Receipt size={28} className="text-primary" />
          <div>
            <h2 className="font-display text-2xl font-bold" style={{ color: "#1A365D" }}>
              {t("refund.title")}
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
              {t("privacy.title")}
            </Link>
            <Link to="/terms" className="hover:underline" style={{ color: "#D4A017" }}>
              {t("terms.title")}
            </Link>
            <Link to="/login" className="hover:underline" style={{ color: "#D4A017" }}>
              Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

const sectionsEN = [
  {
    title: "Overview",
    content: [
      "IME is sold month to month. You try it free for 14 days before paying anything, and you can cancel at any time without giving a reason.",
    ],
  },
  {
    title: "The 14-day trial comes first",
    content: [
      "Every new account gets 14 days free, starting when you confirm your email. No card is charged during the trial. If you do not subscribe, nothing is billed — there is nothing to refund.",
    ],
  },
  {
    title: "Your first payment: 14 days to change your mind",
    content: [
      "If you subscribe and then decide IME is not for you, write to us within 14 days of your first payment and we will refund it in full. You do not need a reason.",
      "This applies to your first paid month on an account. It is a full refund, not a partial one.",
    ],
  },
  {
    title: "Later months",
    content: [
      "After the first month, monthly payments are not refunded once the month has started, because you have had the Service for that period. What you do instead is cancel: cancelling stops the next charge, and you keep using everything until the end of the period you already paid for.",
      "There are four exceptions where we do refund a month already started: if we charged you after you cancelled, refunded in full, always; if the Service was unavailable for a long period through our fault, refunded in proportion to the time lost; if we removed a feature you were paying for during your paid period, in which case you may cancel and we refund the unused part; and if we closed your account without cause, where we refund the unused part.",
    ],
  },
  {
    title: "Upgrades and downgrades",
    content: [
      "An upgrade takes effect immediately and is charged pro rata for the rest of the month.",
      "A downgrade takes effect at the start of your next period. We do not refund the difference for the current month — you keep the higher plan until the period ends.",
    ],
  },
  {
    title: "If your local law gives you more",
    content: [
      "Consumer law in some countries gives you stronger cancellation rights than this policy — for example a statutory right to withdraw from a distance contract. Where that is so, your legal rights apply and this policy does not reduce them.",
    ],
  },
  {
    title: "What we do not refund",
    content: [
      "Currency conversion or foreign transaction fees your bank charged; we never receive these. Periods during which the Service worked normally but you did not use it. An account closed for breaking the Terms of Service.",
    ],
  },
  {
    title: "Your data is not held hostage",
    content: [
      "Whether or not a refund applies, closing your account never destroys your records immediately: your family's data stays for 30 days so you can export it. See the Privacy Policy.",
    ],
  },
  {
    title: "How to ask",
    content: [
      "Write to support@independentmindsedu.org from the email address on the account, and tell us the email address on the account and roughly when you were charged. If you want to, tell us what went wrong — for a first-month refund you do not need to say. That is all; there is no form.",
    ],
  },
  {
    title: "What happens next",
    content: [
      "We reply within 3 business days. We process an approved refund within 5 business days of approving it. The money usually reaches your account 5 to 10 business days after that, depending on your bank.",
      "The refund goes back to the card you paid with. We cannot send it anywhere else.",
      "If we say no, we will tell you why, in writing. If you think we got it wrong, reply and ask us to look again — a person will.",
    ],
  },
  {
    title: "Please talk to us before your bank",
    content: [
      "If something is wrong, email us first. A chargeback raised without contacting us costs us a fee and usually takes longer for you than simply asking. We would rather refund you than fight you.",
    ],
  },
  {
    title: "Cancelling, which is not the same thing",
    content: [
      "You do not need to email anyone to cancel. Go to your billing page and cancel there. It takes effect at once, stops the next charge, and leaves your access running until the end of the period you have paid for.",
    ],
  },
  {
    title: "Contact",
    content: [
      "Kolabo Services LLC, [ENTITY ADDRESS] — support@independentmindsedu.org",
    ],
  },
];

const sectionsHT = [
  {
    title: "Rezime",
    content: [
      "Nou vann IME mwa pa mwa. Ou eseye l gratis pandan 14 jou anvan ou peye anyen, epi ou ka anile nenpòt kilè san bay rezon.",
    ],
  },
  {
    title: "Peryòd esè 14 jou a vini an premye",
    content: [
      "Chak nouvo kont jwenn 14 jou gratis, ki kòmanse lè ou konfime imel ou. Nou pa fè okenn chaj sou kat la pandan peryòd esè a. Si ou pa abònen, nou pa fakti anyen — pa gen anyen pou ranbouse.",
    ],
  },
  {
    title: "Premye peman w: 14 jou pou chanje lide",
    content: [
      "Si ou abònen epi apre sa ou deside IME pa pou ou, ekri nou nan 14 jou apre premye peman w epi n ap ranbouse l nèt. Ou pa bezwen bay rezon.",
      "Sa aplike pou premye mwa ou peye sou yon kont. Se yon ranbousman konplè, se pa yon pati.",
    ],
  },
  {
    title: "Mwa ki vin apre yo",
    content: [
      "Apre premye mwa a, nou pa ranbouse peman chak mwa yo depi mwa a kòmanse, paske ou te gen Sèvis la pou peryòd sa a. Sa ou fè pito se anile: anile rete pwochen chaj la, epi ou kontinye itilize tout bagay jiska fen peryòd ou deja peye a.",
      "Gen kat eksepsyon kote nou ranbouse yon mwa ki deja kòmanse: si nou fè w peye apre ou te anile, ranbouse nèt, toujou; si Sèvis la te endisponib pou yon bon bout tan akòz fòt nou, ranbouse an pwopòsyon ak tan ki pèdi a; si nou retire yon feature ou t ap peye pou li pandan peryòd ou peye a, kote ou ka anile epi nou ranbouse pati ou pa itilize a; epi si nou fèmen kont ou san rezon, kote nou ranbouse pati ou pa itilize a.",
    ],
  },
  {
    title: "Upgrade ak downgrade",
    content: [
      "Yon upgrade pran efè imedyatman epi nou fakti l an pwopòsyon pou rès mwa a.",
      "Yon downgrade pran efè lè pwochen peryòd ou kòmanse. Nou pa ranbouse diferans lan pou mwa kouran an — ou kenbe plan ki pi wo a jiska fen peryòd la.",
    ],
  },
  {
    title: "Si lwa lokal ou ba w plis",
    content: [
      "Lwa konsomatè nan kèk peyi ba w dwa anilasyon ki pi fò pase politik sa a — pa egzanp yon dwa legal pou retire w nan yon kontra adistans. Kote se konsa, dwa legal ou yo aplike epi politik sa a pa diminye yo.",
    ],
  },
  {
    title: "Sa nou pa ranbouse",
    content: [
      "Frè konvèsyon lajan oswa frè tranzaksyon etranje bank ou fè w peye; nou pa janm resevwa yo. Peryòd kote Sèvis la t ap mache nòmalman men ou pa t itilize l. Yon kont nou fèmen paske li te vyole Kondisyon Sèvis yo.",
    ],
  },
  {
    title: "Done w pa kenbe an otaj",
    content: [
      "Kit yon ranbousman aplike kit li pa aplike, lè ou fèmen kont ou sa pa janm detwi dosye w imedyatman: done fanmi w rete 30 jou pou ou ka ekspòte yo. Gade Politik Konfidansyalite a.",
    ],
  },
  {
    title: "Kijan pou mande",
    content: [
      "Ekri support@independentmindsedu.org depi adrès imel ki sou kont lan, epi di nou adrès imel ki sou kont lan ak apeprè kilè nou te fè chaj la. Si ou vle, di nou sa ki pa t mache — pou yon ranbousman premye mwa ou pa bezwen di. Se tout; pa gen fòm pou ranpli.",
    ],
  },
  {
    title: "Sa ki pase apre",
    content: [
      "Nou reponn nan 3 jou ouvrab. Nou trete yon ranbousman nou apwouve nan 5 jou ouvrab apre nou apwouve l. Lajan an anjeneral rive nan kont ou 5 a 10 jou ouvrab apre sa, selon bank ou.",
      "Ranbousman an retounen sou kat ou te peye a. Nou pa ka voye l okenn lòt kote.",
      "Si nou di non, n ap di w poukisa, alekri. Si ou panse nou fè erè, reponn epi mande nou gade l ankò — se yon moun k ap fè sa.",
    ],
  },
  {
    title: "Tanpri pale ak nou anvan bank ou",
    content: [
      "Si yon bagay pa bon, voye yon imel ba nou anvan. Yon chargeback ou leve san ou pa kontakte nou koute nou yon frè epi anjeneral li pran plis tan pou ou pase si ou te annik mande. Nou ta pito ranbouse w pase goumen avè w.",
    ],
  },
  {
    title: "Anile, ki pa menm bagay la",
    content: [
      "Ou pa bezwen voye imel bay pèsonn pou anile. Ale sou paj fakti w epi anile la. Li pran efè touswit, li rete pwochen chaj la, epi li kite aksè w ap mache jiska fen peryòd ou peye a.",
    ],
  },
  {
    title: "Kontak",
    content: [
      "Kolabo Services LLC, [ADRÈS KONPAYI A] — support@independentmindsedu.org",
    ],
  },
];
