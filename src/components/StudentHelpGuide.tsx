import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen, CheckSquare, Trophy, Award, Bot, Coins, UserCircle,
  HelpCircle, ChevronRight, ChevronLeft, Star, Zap, Target, Bell,
  ArrowRight, Sparkles
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface GuideSection {
  icon: React.ElementType;
  titleEN: string;
  titleHT: string;
  titleFR: string;
  stepsEN: string[];
  stepsHT: string[];
  stepsFR: string[];
  tipEN?: string;
  tipHT?: string;
  tipFR?: string;
}

const SECTIONS: GuideSection[] = [
  {
    icon: BookOpen,
    titleEN: "📚 Today's Blocks",
    titleHT: "📚 Blòk Jodi a",
    titleFR: "📚 Blocs du jour",
    stepsEN: [
      "When you open the app, you see today's learning blocks.",
      "Each block shows a subject (Math, English, Science, etc.) and a time.",
      "Tap 'Start Block' to begin. A timer tracks your session.",
      "When finished, tap 'Mark Done'. Rate your work 1-5 stars.",
      "You can also enter your Time4Learning score if you have one.",
      "Completing blocks earns you points! 🎉",
    ],
    stepsHT: [
      "Lè ou louvri app la, ou wè blòk aprantisaj jodi a.",
      "Chak blòk montre yon matyè (Matematik, Anglè, Syans, elatriye) ak yon lè.",
      "Tape 'Kòmanse Blòk' pou kòmanse. Yon krononomèt suiv sesyon ou.",
      "Lè ou fini, tape 'Make Fini'. Bay travay ou 1-5 zetwal.",
      "Ou ka antre nòt Time4Learning ou tou si ou gen youn.",
      "Konplete blòk fè ou touche pwen! 🎉",
    ],
    stepsFR: [
      "Quand vous ouvrez l'application, vous voyez les blocs d'apprentissage du jour.",
      "Chaque bloc montre une matière (Maths, Anglais, Sciences, etc.) et une heure.",
      "Appuyez sur 'Commencer' pour débuter. Un chronomètre suit votre session.",
      "Quand vous avez terminé, appuyez sur 'Terminé'. Notez votre travail de 1 à 5 étoiles.",
      "Vous pouvez aussi entrer votre score Time4Learning si vous en avez un.",
      "Compléter des blocs vous fait gagner des points! 🎉",
    ],
    tipEN: "Try to finish all your blocks every day for a Perfect Day bonus (+50 points)!",
    tipHT: "Eseye fini tout blòk ou chak jou pou yon bonus Jou Pafè (+50 pwen)!",
    tipFR: "Essayez de finir tous vos blocs chaque jour pour un bonus Journée Parfaite (+50 points)!",
  },
  {
    icon: Coins,
    titleEN: "💰 Rewards & Points",
    titleHT: "💰 Rekonpans & Pwen",
    titleFR: "💰 Récompenses & Points",
    stepsEN: [
      "You earn points by completing blocks, doing check-ins, and meeting goals.",
      "Your point balance shows at the top of the Rewards tab.",
      "If your parent has set up rewards, you can spend points to redeem them.",
      "If no rewards are set up, you'll see suggestion cards — tap one to send it to your parent!",
      "Complete challenges for extra bonus points.",
      "Your parent can also give you bonus points for good behavior!",
    ],
    stepsHT: [
      "Ou touche pwen lè ou konplete blòk, fè tcheke, ak rive nan objektif.",
      "Balans pwen ou parèt anlè tab Rekonpans la.",
      "Si paran ou te mete rekonpans, ou ka depanse pwen pou reklame yo.",
      "Si pa gen rekonpans, w ap wè kat sijesyon — tape youn pou voye l bay paran ou!",
      "Konplete defi pou pwen bonus anplis.",
      "Paran ou ka ba ou pwen bonus tou pou bon konpòtman!",
    ],
    stepsFR: [
      "Vous gagnez des points en complétant des blocs, en faisant des check-ins et en atteignant vos objectifs.",
      "Votre solde de points apparaît en haut de l'onglet Récompenses.",
      "Si vos parents ont configuré des récompenses, vous pouvez dépenser vos points.",
      "S'il n'y a pas de récompenses, vous verrez des suggestions — appuyez pour les envoyer à vos parents!",
      "Complétez des défis pour des points bonus supplémentaires.",
      "Vos parents peuvent aussi vous donner des points bonus pour bon comportement!",
    ],
    tipEN: "Points breakdown: Block = +10 · Check-in = +15 · Perfect Day = +50 · 3-Day Streak = +30 · 7-Day Streak = +100",
    tipHT: "Pwen: Blòk = +10 · Tcheke = +15 · Jou Pafè = +50 · Seri 3 Jou = +30 · Seri 7 Jou = +100",
    tipFR: "Points: Bloc = +10 · Check-in = +15 · Jour Parfait = +50 · Série 3 Jours = +30 · Série 7 Jours = +100",
  },
  {
    icon: CheckSquare,
    titleEN: "✅ Daily Check-In",
    titleHT: "✅ Tcheke Chak Jou",
    titleFR: "✅ Check-in Quotidien",
    stepsEN: [
      "Go to the Check-In tab at the bottom of your screen.",
      "Select how you're feeling today: Good 😊, Okay 😐, or Tired 😴.",
      "Rate your focus level: High 🔥, Medium ⚡, or Low 🐢.",
      "Enter how many blocks you completed.",
      "Toggle 'Need Help' if you're stuck — your parent will be notified!",
      "Add a comment if you want (optional).",
      "Tap 'Submit Check-In' — you earn +15 points!",
    ],
    stepsHT: [
      "Ale nan tab Tcheke anba ekran ou.",
      "Chwazi kijan ou santi ou jodi a: Bon 😊, Okay 😐, oswa Fatige 😴.",
      "Bay nivo konsantrasyon ou: Wo 🔥, Mwayen ⚡, oswa Ba 🐢.",
      "Antre konbyen blòk ou fini.",
      "Mete 'Bezwen Èd' si ou bloke — paran ou ap resevwa yon notifikasyon!",
      "Ajoute yon kòmantè si ou vle (opsyonèl).",
      "Tape 'Soumèt Tcheke' — ou touche +15 pwen!",
    ],
    stepsFR: [
      "Allez dans l'onglet Check-in en bas de votre écran.",
      "Sélectionnez comment vous vous sentez: Bien 😊, OK 😐, ou Fatigué 😴.",
      "Évaluez votre niveau de concentration: Haut 🔥, Moyen ⚡, ou Bas 🐢.",
      "Entrez combien de blocs vous avez complétés.",
      "Activez 'Besoin d'aide' si vous êtes bloqué — vos parents seront notifiés!",
      "Ajoutez un commentaire si vous le souhaitez (optionnel).",
      "Appuyez sur 'Soumettre' — vous gagnez +15 points!",
    ],
    tipEN: "Do a check-in every day to build your streak! 🔥",
    tipHT: "Fè yon tcheke chak jou pou bati seri ou! 🔥",
    tipFR: "Faites un check-in chaque jour pour construire votre série! 🔥",
  },
  {
    icon: Bot,
    titleEN: "🤖 Mr A — AI Tutor",
    titleHT: "🤖 Mr A — Pwofesè AI",
    titleFR: "🤖 Mr A — Tuteur IA",
    stepsEN: [
      "Mr A is your personal AI tutor who can help with unknown subject.",
      "Go to the 'Mr A' tab at the bottom of the screen.",
      "Choose a subject from the dropdown (Math, English, Science, etc.).",
      "Type your question and press Send.",
      "Mr A remembers your conversation for each subject separately.",
      "You can clear history anytime with the trash icon.",
    ],
    stepsHT: [
      "Mr A se pwofesè AI pèsonèl ou ki ka ede ou ak nenpòt matyè.",
      "Ale nan tab 'Mr A' anba ekran an.",
      "Chwazi yon matyè nan lis la (Matematik, Anglè, Syans, elatriye).",
      "Tape kesyon ou epi peze Voye.",
      "Mr A sonje konvèsasyon ou pou chak matyè apa.",
      "Ou ka efase istwa nenpòt kilè ak ikòn poubèl la.",
    ],
    stepsFR: [
      "Mr A est votre tuteur IA personnel qui peut aider avec toute matière.",
      "Allez dans l'onglet 'Mr A' en bas de l'écran.",
      "Choisissez une matière dans la liste (Maths, Anglais, Sciences, etc.).",
      "Tapez votre question et appuyez sur Envoyer.",
      "Mr A se souvient de votre conversation pour chaque matière séparément.",
      "Vous pouvez effacer l'historique à tout moment avec l'icône poubelle.",
    ],
    tipEN: "Mr A can explain concepts, help with homework, or quiz you on what you learned!",
    tipHT: "Mr A ka eksplike konsèp, ede ak devwa, oswa kesyonnen ou sou sa ou aprann!",
    tipFR: "Mr A peut expliquer des concepts, aider avec les devoirs, ou vous interroger!",
  },
  {
    icon: Trophy,
    titleEN: "🏆 Badges & Trophies",
    titleHT: "🏆 Badj & Twofe",
    titleFR: "🏆 Badges & Trophées",
    stepsEN: [
      "Every week, you earn a badge based on how many blocks you completed.",
      "🏆 Champion = 90%+ of blocks · ⭐ Gold Star = 70%+ · 💪 Keep Going = below 70%.",
      "Special achievements unlock trophies: 20-Lesson Legend, Weekly Warrior, and more.",
      "View your badge collection in the Badges tab.",
      "View trophies and milestones in the Trophies tab.",
    ],
    stepsHT: [
      "Chak semèn, ou touche yon badj selon konbyen blòk ou fini.",
      "🏆 Chanpyon = 90%+ blòk · ⭐ Zetwal Lò = 70%+ · 💪 Kontinye = anba 70%.",
      "Akonplisman espesyal deboke twofe: Lejand 20 Leson, Gerye Semèn, ak plis ankò.",
      "Gade koleksyon badj ou nan tab Badj la.",
      "Gade twofe ak etap enpòtan nan tab Twofe a.",
    ],
    stepsFR: [
      "Chaque semaine, vous gagnez un badge selon le nombre de blocs complétés.",
      "🏆 Champion = 90%+ · ⭐ Étoile d'Or = 70%+ · 💪 Continue = moins de 70%.",
      "Des réalisations spéciales débloquent des trophées: Légende 20 Leçons, et plus.",
      "Consultez votre collection de badges dans l'onglet Badges.",
      "Consultez les trophées dans l'onglet Trophées.",
    ],
  },
  {
    icon: UserCircle,
    titleEN: "👤 Your Profile",
    titleHT: "👤 Pwofil Ou",
    titleFR: "👤 Votre Profil",
    stepsEN: [
      "Go to the Profile tab to see your student information.",
      "Your photo, grade level, and enrollment date are shown here.",
      "You can see your parent's contact information.",
      "Language preference can be changed using the language toggle in the header.",
    ],
    stepsHT: [
      "Ale nan tab Pwofil pou wè enfòmasyon elèv ou.",
      "Foto ou, nivo klas, ak dat enskripsyon parèt la.",
      "Ou ka wè enfòmasyon kontak paran ou.",
      "Ou ka chanje lang ak bouton lang nan tèt la.",
    ],
    stepsFR: [
      "Allez dans l'onglet Profil pour voir vos informations.",
      "Votre photo, niveau scolaire et date d'inscription sont affichés.",
      "Vous pouvez voir les coordonnées de vos parents.",
      "Changez la langue avec le bouton dans l'en-tête.",
    ],
  },
  {
    icon: HelpCircle,
    titleEN: "❓ Need Help?",
    titleHT: "❓ Bezwen Èd?",
    titleFR: "❓ Besoin d'aide?",
    stepsEN: [
      "If you're stuck on a lesson, ask Mr A for help!",
      "If you need to talk to your parent, toggle 'Need Help' in your check-in.",
      "Your parent will receive a notification on their phone.",
      "You can also suggest rewards you'd like to earn!",
    ],
    stepsHT: [
      "Si ou bloke sou yon leson, mande Mr A pou èd!",
      "Si ou bezwen pale ak paran ou, mete 'Bezwen Èd' nan tcheke ou.",
      "Paran ou ap resevwa yon notifikasyon sou telefòn yo.",
      "Ou ka sijere rekonpans ou ta renmen touche tou!",
    ],
    stepsFR: [
      "Si vous êtes bloqué sur une leçon, demandez l'aide de Mr A!",
      "Si vous devez parler à vos parents, activez 'Besoin d'aide' dans le check-in.",
      "Vos parents recevront une notification sur leur téléphone.",
      "Vous pouvez aussi suggérer des récompenses que vous aimeriez gagner!",
    ],
  },
];

type GuideLang = "EN" | "HT" | "FR";

export function StudentHelpGuide({ open, onClose }: Props) {
  const { lang: appLang } = useI18n();
  const [guideLang, setGuideLang] = useState<GuideLang>(appLang === "HT" ? "HT" : "EN");
  const [currentSection, setCurrentSection] = useState(0);

  const section = SECTIONS[currentSection];
  const Icon = section.icon;

  const getTitle = (s: GuideSection) =>
    guideLang === "HT" ? s.titleHT : guideLang === "FR" ? s.titleFR : s.titleEN;
  const getSteps = (s: GuideSection) =>
    guideLang === "HT" ? s.stepsHT : guideLang === "FR" ? s.stepsFR : s.stepsEN;
  const getTip = (s: GuideSection) =>
    guideLang === "HT" ? s.tipHT : guideLang === "FR" ? s.tipFR : s.tipEN;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-lg">
              {guideLang === "HT" ? "Gid Elèv" : guideLang === "FR" ? "Guide Étudiant" : "Student Guide"}
            </DialogTitle>
            <div className="flex gap-1">
              {(["EN", "HT", "FR"] as GuideLang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setGuideLang(l)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                    guideLang === l
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Section nav pills */}
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
            {SECTIONS.map((s, i) => {
              const SIcon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentSection(i)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    currentSection === i
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <SIcon size={12} />
                  <span className="hidden sm:inline">{getTitle(s).replace(/^[^\s]+\s/, "")}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4 py-2">
            {/* Section title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon size={24} className="text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold">{getTitle(section)}</h3>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {getSteps(section).map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-secondary">{i + 1}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            {/* Tip */}
            {getTip(section) && (
              <div className="rounded-lg bg-secondary/10 border border-secondary/20 p-3 flex gap-2">
                <Sparkles size={16} className="text-secondary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-secondary-foreground font-medium">{getTip(section)}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentSection === 0}
            onClick={() => setCurrentSection(currentSection - 1)}
          >
            <ChevronLeft size={16} className="mr-1" />
            {guideLang === "HT" ? "Avan" : guideLang === "FR" ? "Précédent" : "Previous"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentSection + 1} / {SECTIONS.length}
          </span>
          {currentSection < SECTIONS.length - 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentSection(currentSection + 1)}
            >
              {guideLang === "HT" ? "Pwochen" : guideLang === "FR" ? "Suivant" : "Next"}
              <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={onClose} className="font-display">
              {guideLang === "HT" ? "Fèmen" : guideLang === "FR" ? "Fermer" : "Done"} ✅
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
