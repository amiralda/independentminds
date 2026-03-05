import React, { createContext, useContext, useState } from "react";

type Lang = "EN" | "HT" | "FR";

const translations: Record<string, Record<Lang, string>> = {
  "app.title": { EN: "Lekòl Fasil", HT: "Lekòl Fasil", FR: "Lekòl Fasil" },
  "app.subtitle": { EN: "Learning Made Easy", HT: "Aprann Fasil", FR: "Apprentissage Facile" },
  "nav.today": { EN: "Today", HT: "Jodi a", FR: "Aujourd'hui" },
  "nav.checkin": { EN: "Check-In", HT: "Tcheke", FR: "Bilan" },
  "nav.badges": { EN: "Badges", HT: "Badj", FR: "Badges" },
  "nav.library": { EN: "Library", HT: "Bibliyotèk", FR: "Bibliothèque" },
  "nav.dadPanel": { EN: "Dad Panel", HT: "Panel Papa", FR: "Panel Papa" },
  "status.planned": { EN: "Planned", HT: "Planifye", FR: "Planifié" },
  "status.inProgress": { EN: "In Progress", HT: "Ap fèt", FR: "En cours" },
  "status.done": { EN: "Done", HT: "Fini", FR: "Terminé" },
  "status.missed": { EN: "Missed", HT: "Manke", FR: "Manqué" },
  "action.start": { EN: "Start Block", HT: "Kòmanse Blòk", FR: "Commencer" },
  "action.markDone": { EN: "Mark Done", HT: "Make Fini", FR: "Marquer terminé" },
  "mood.good": { EN: "Good 😊", HT: "Bon 😊", FR: "Bien 😊" },
  "mood.okay": { EN: "Okay 😐", HT: "Okay 😐", FR: "Correct 😐" },
  "mood.tired": { EN: "Tired 😴", HT: "Fatige 😴", FR: "Fatigué 😴" },
  "focus.high": { EN: "High 🔥", HT: "Wo 🔥", FR: "Élevé 🔥" },
  "focus.medium": { EN: "Medium ⚡", HT: "Mwayen ⚡", FR: "Moyen ⚡" },
  "focus.low": { EN: "Low 🐢", HT: "Ba 🐢", FR: "Bas 🐢" },
  "checkin.mood": { EN: "How are you feeling?", HT: "Kijan ou santi ou?", FR: "Comment te sens-tu?" },
  "checkin.focus": { EN: "How is your focus?", HT: "Kijan konsantrasyon ou ye?", FR: "Comment est ta concentration?" },
  "checkin.needHelp": { EN: "Do you need help?", HT: "Èske ou bezwen èd?", FR: "As-tu besoin d'aide?" },
  "checkin.comment": { EN: "Any comments?", HT: "Kòmantè?", FR: "Des commentaires?" },
  "checkin.submit": { EN: "Submit Check-In", HT: "Soumèt Tcheke", FR: "Soumettre le bilan" },
  "checkin.success": { EN: "Check-in submitted!", HT: "Tcheke soumèt!", FR: "Bilan soumis!" },
  "badge.champion": { EN: "🏆 Champion of the Week!", HT: "🏆 Chanpyon Semèn nan!", FR: "🏆 Champion de la semaine!" },
  "badge.goldStar": { EN: "⭐ Gold Star!", HT: "⭐ Zetwal Lò!", FR: "⭐ Étoile d'or!" },
  "badge.keepGoing": { EN: "💪 Keep Going!", HT: "💪 Kontinye!", FR: "💪 Continue!" },
  "badge.newWeek": { EN: "🔄 New Week, New Start!", HT: "🔄 Nouvo Semèn, Nouvo Kòmansman!", FR: "🔄 Nouvelle semaine, nouveau départ!" },
  "greeting.morning": { EN: "Good morning, Chris!", HT: "Bonjou, Chris!", FR: "Bonjour, Chris!" },
  "greeting.afternoon": { EN: "Good afternoon, Chris!", HT: "Bonswa, Chris!", FR: "Bon après-midi, Chris!" },
  "greeting.evening": { EN: "Good evening, Chris!", HT: "Bonswa, Chris!", FR: "Bonsoir, Chris!" },
  "role.student": { EN: "Student", HT: "Elèv", FR: "Élève" },
  "role.parent": { EN: "Parent/Admin", HT: "Paran/Admin", FR: "Parent/Admin" },
  "dad.schedule": { EN: "Weekly Schedule", HT: "Orè Semèn", FR: "Emploi du temps" },
  "dad.progress": { EN: "Progress", HT: "Pwogrè", FR: "Progrès" },
  "dad.alerts": { EN: "Alerts", HT: "Alèt", FR: "Alertes" },
  "dad.curriculum": { EN: "Curriculum", HT: "Pwogram", FR: "Programme" },
  "yes": { EN: "Yes", HT: "Wi", FR: "Oui" },
  "no": { EN: "No", HT: "Non", FR: "Non" },
  "blocks.done": { EN: "Blocks Done", HT: "Blòk Fini", FR: "Blocs terminés" },
  "rating": { EN: "How did it go? (1-5)", HT: "Kijan sa te ale? (1-5)", FR: "Comment ça s'est passé? (1-5)" },
  "score": { EN: "T4L Score (optional)", HT: "Nòt T4L (opsyonèl)", FR: "Note T4L (optionnel)" },
  "notes": { EN: "Notes (optional)", HT: "Nòt (opsyonèl)", FR: "Notes (optionnel)" },
  "save": { EN: "Save", HT: "Sove", FR: "Sauvegarder" },
  "cancel": { EN: "Cancel", HT: "Anile", FR: "Annuler" },
  "library.title": { EN: "Learning Resources", HT: "Resous Aprantisaj", FR: "Ressources" },
  "library.t4l": { EN: "Open Time4Learning", HT: "Louvri Time4Learning", FR: "Ouvrir Time4Learning" },
};

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "EN",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("EN");
  const t = (key: string) => translations[key]?.[lang] || translations[key]?.["EN"] || key;
  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
export type { Lang };
