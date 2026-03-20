import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Lang = "EN" | "HT";

const translations: Record<string, Record<Lang, string>> = {
  // App
  "app.title": { EN: "Independent Minds", HT: "Independent Minds" },
  "app.subtitle": { EN: "Learn Smart. Grow Every Day.", HT: "Aprann Enpòtan. Grandi Chak Jou." },
  "app.version": { EN: "Independent Minds EDU v2.0", HT: "Independent Minds EDU v2.0" },

  // Nav
  "nav.today": { EN: "Today", HT: "Jodi a" },
  "nav.checkin": { EN: "Check-In", HT: "Tcheke" },
  "nav.badges": { EN: "Badges", HT: "Badj" },
  "nav.library": { EN: "Library", HT: "Bibliyotèk" },
  "nav.dadPanel": { EN: "Parent Dashboard", HT: "Tablo Paran" },
  "nav.tracks": { EN: "Tracks", HT: "Pis" },
  "nav.trophies": { EN: "Trophies", HT: "Twofe" },
  "nav.settings": { EN: "Settings", HT: "Paramèt" },
  "nav.alerts": { EN: "Alerts", HT: "Alèt" },
  "nav.progress": { EN: "Today", HT: "Jodi a" },
  "nav.schedule": { EN: "Schedule", HT: "Orè" },
  "nav.feed": { EN: "Feed", HT: "Aktivite" },
  "nav.curriculum": { EN: "Curriculum", HT: "Pwogram" },
  "nav.certificates": { EN: "Certificates", HT: "Sètifika" },
  "nav.reports": { EN: "Reports", HT: "Rapò" },
  "nav.telegram": { EN: "Telegram", HT: "Telegram" },
  "nav.records": { EN: "Records", HT: "Dosye" },

  // Status
  "status.planned": { EN: "Planned", HT: "Planifye" },
  "status.inProgress": { EN: "In Progress", HT: "Ap fèt" },
  "status.done": { EN: "Done", HT: "Fini" },
  "status.missed": { EN: "Missed", HT: "Manke" },

  // Actions
  "action.start": { EN: "Start Block", HT: "Kòmanse Blòk" },
  "action.markDone": { EN: "Mark Done", HT: "Make Fini" },
  "action.save": { EN: "Save", HT: "Sove" },
  "action.cancel": { EN: "Cancel", HT: "Anile" },
  "action.add": { EN: "Add", HT: "Ajoute" },
  "action.edit": { EN: "Edit", HT: "Modifye" },
  "action.delete": { EN: "Delete", HT: "Efase" },
  "action.undo": { EN: "Undo", HT: "Defèt" },
  "action.override": { EN: "Override", HT: "Remèt" },
  "action.signOut": { EN: "Sign Out", HT: "Dekonekte" },
  "action.signIn": { EN: "Sign In", HT: "Konekte" },
  "action.signUp": { EN: "Sign Up", HT: "Enskri" },
  "action.continueWith": { EN: "Continue with", HT: "Kontinye ak" },
  "action.addStudent": { EN: "Add Student", HT: "Ajoute Elèv" },
  "action.selectStudent": { EN: "Select Student", HT: "Chwazi Elèv" },

  // Mood & Focus
  "mood.good": { EN: "Good 😊", HT: "Bon 😊" },
  "mood.okay": { EN: "Okay 😐", HT: "Okay 😐" },
  "mood.tired": { EN: "Tired 😴", HT: "Fatige 😴" },
  "focus.high": { EN: "High 🔥", HT: "Wo 🔥" },
  "focus.medium": { EN: "Medium ⚡", HT: "Mwayen ⚡" },
  "focus.low": { EN: "Low 🐢", HT: "Ba 🐢" },

  // Check-in
  "checkin.mood": { EN: "How are you feeling?", HT: "Kijan ou santi ou?" },
  "checkin.focus": { EN: "How is your focus?", HT: "Kijan konsantrasyon ou ye?" },
  "checkin.needHelp": { EN: "Do you need help?", HT: "Èske ou bezwen èd?" },
  "checkin.comment": { EN: "Any comments?", HT: "Kòmantè?" },
  "checkin.submit": { EN: "Submit Check-In", HT: "Soumèt Tcheke" },
  "checkin.success": { EN: "Check-in submitted!", HT: "Tcheke soumèt!" },

  // Badges
  "badge.champion": { EN: "🏆 Champion of the Week!", HT: "🏆 Chanpyon Semèn nan!" },
  "badge.goldStar": { EN: "⭐ Gold Star!", HT: "⭐ Zetwal Lò!" },
  "badge.keepGoing": { EN: "💪 Keep Going!", HT: "💪 Kontinye!" },
  "badge.newWeek": { EN: "🔄 New Week, New Start!", HT: "🔄 Nouvo Semèn, Nouvo Kòmansman!" },

  // Greetings
  "greeting.morning": { EN: "Good morning", HT: "Bonjou" },
  "greeting.afternoon": { EN: "Good afternoon", HT: "Bonswa" },
  "greeting.evening": { EN: "Good evening", HT: "Bonswa" },

  // Roles
  "role.student": { EN: "Student", HT: "Elèv" },
  "role.parent": { EN: "Parent/Admin", HT: "Paran/Admin" },

  // Yes/No
  "yes": { EN: "Yes", HT: "Wi" },
  "no": { EN: "No", HT: "Non" },

  // Blocks & Scores
  "blocks.done": { EN: "Blocks Done", HT: "Blòk Fini" },
  "rating": { EN: "How did it go? (1-5)", HT: "Kijan sa te ale? (1-5)" },
  "score": { EN: "T4L Score (optional)", HT: "Nòt T4L (opsyonèl)" },
  "notes": { EN: "Notes (optional)", HT: "Nòt (opsyonèl)" },

  // Library
  "library.title": { EN: "Learning Resources", HT: "Resous Aprantisaj" },
  "library.t4l": { EN: "Open Time4Learning", HT: "Louvri Time4Learning" },

  // Auth
  "auth.email": { EN: "Email", HT: "Imèl" },
  "auth.password": { EN: "Password", HT: "Modpas" },
  "auth.displayName": { EN: "Display Name", HT: "Non Afichaj" },
  "auth.signingIn": { EN: "Signing in...", HT: "Ap konekte..." },
  "auth.creatingAccount": { EN: "Creating account...", HT: "Ap kreye kont..." },
  "auth.noAccount": { EN: "Don't have an account?", HT: "Ou pa gen kont?" },
  "auth.hasAccount": { EN: "Already have an account?", HT: "Ou gen kont deja?" },
  "auth.orContinueWith": { EN: "Or continue with", HT: "Oubyen kontinye ak" },
  "auth.checkEmail": { EN: "Check your email to confirm your account!", HT: "Tcheke imèl ou pou konfime kont ou!" },
  "auth.forgotPassword": { EN: "Forgot Password?", HT: "Bliye Modpas?" },
  "auth.forgotPasswordDesc": { EN: "Enter your email and we'll send you a reset link.", HT: "Antre imèl ou epi n ap voye yon lyen pou reyinisyalize." },
  "auth.sendResetLink": { EN: "Send Reset Link", HT: "Voye Lyen Reyinisyalize" },
  "auth.sending": { EN: "Sending...", HT: "Ap voye..." },
  "auth.checkYourEmail": { EN: "Check Your Email", HT: "Tcheke Imèl Ou" },
  "auth.resetEmailSent": { EN: "We've sent a password reset link to your email.", HT: "Nou voye yon lyen reyinisyalize modpas nan imèl ou." },
  "auth.backToLogin": { EN: "Back to Login", HT: "Retounen nan Koneksyon" },
  "auth.setNewPassword": { EN: "Set New Password", HT: "Mete Nouvo Modpas" },
  "auth.newPassword": { EN: "New Password", HT: "Nouvo Modpas" },
  "auth.confirmPassword": { EN: "Confirm Password", HT: "Konfime Modpas" },
  "auth.updatePassword": { EN: "Update Password", HT: "Mete Modpas Ajou" },
  "auth.updating": { EN: "Updating...", HT: "Ap mete ajou..." },
  "auth.passwordUpdated": { EN: "Password updated successfully!", HT: "Modpas mete ajou avèk siksè!" },
  "auth.passwordMismatch": { EN: "Passwords do not match", HT: "Modpas yo pa menm" },
  "auth.passwordTooShort": { EN: "Password must be at least 6 characters", HT: "Modpas dwe gen omwen 6 karaktè" },
  "auth.invalidResetLink": { EN: "Invalid Reset Link", HT: "Lyen Reyinisyalize Envalid" },
  "auth.invalidResetDesc": { EN: "This link is invalid or has expired. Please request a new one.", HT: "Lyen sa a envalid oswa li ekspire. Tanpri mande yon nouvo." },

  // Welcome Modal
  "welcome.title": { EN: "Welcome to Independent Minds! 🎓", HT: "Byenvini nan Independent Minds! 🎓" },
  "welcome.subtitle": { EN: "Let's set up your learning environment.", HT: "Ann konfigire anviwònman aprantisaj ou." },
  "welcome.addFirst": { EN: "Start by adding your first student", HT: "Kòmanse pa ajoute premye elèv ou" },
  "welcome.getStarted": { EN: "Get Started", HT: "Kòmanse" },

  // Student management
  "student.name": { EN: "Student Name", HT: "Non Elèv" },
  "student.id": { EN: "Student ID", HT: "ID Elèv" },
  "student.grade": { EN: "Grade Level", HT: "Nivo Klas" },
  "student.noStudents": { EN: "No students yet", HT: "Pa gen elèv ankò" },
  "student.addDescription": { EN: "Add your first student to get started!", HT: "Ajoute premye elèv ou pou kòmanse!" },
  "student.created": { EN: "Student added with default tracks!", HT: "Elèv ajoute ak pis pa defo!" },

  // Tracks
  "tracks.title": { EN: "Learning Tracks", HT: "Pis Aprantisaj" },
  "tracks.addTrack": { EN: "Add Track", HT: "Ajoute Pis" },
  "tracks.editTrack": { EN: "Edit Track", HT: "Modifye Pis" },
  "tracks.newTrack": { EN: "New Learning Track", HT: "Nouvo Pis Aprantisaj" },
  "tracks.name": { EN: "Track Name", HT: "Non Pis" },
  "tracks.category": { EN: "Category", HT: "Kategori" },
  "tracks.dailyTarget": { EN: "Daily Target", HT: "Objektif Chak Jou" },
  "tracks.unitType": { EN: "Unit Type", HT: "Tip Inite" },
  "tracks.icon": { EN: "Icon", HT: "Ikòn" },
  "tracks.color": { EN: "Color", HT: "Koulè" },
  "tracks.noTracks": { EN: "No learning tracks set up yet", HT: "Pa gen pis aprantisaj ankò" },
  "tracks.askParent": { EN: "Ask your parent to configure your learning tracks!", HT: "Mande paran ou pou konfigire pis aprantisaj ou!" },
  "tracks.today": { EN: "today", HT: "jodi a" },

  // Activity Feed
  "feed.title": { EN: "Today's Activity Feed", HT: "Aktivite Jodi a" },
  "feed.noActivity": { EN: "No activities logged today", HT: "Pa gen aktivite jodi a" },
  "feed.overrideTitle": { EN: "Override Activity", HT: "Korije Aktivite" },

  // Telegram
  "telegram.title": { EN: "Telegram Notifications", HT: "Notifikasyon Telegram" },
  "telegram.active": { EN: "Active", HT: "Aktif" },
  "telegram.configure": { EN: "Configure Telegram", HT: "Konfigire Telegram" },
  "telegram.botToken": { EN: "Bot Token", HT: "Token Bot" },
  "telegram.chatId": { EN: "Chat ID", HT: "ID Chat" },
  "telegram.saved": { EN: "Telegram settings saved!", HT: "Paramèt Telegram sove!" },
  "telegram.test": { EN: "Test Connection", HT: "Teste Koneksyon" },
  "telegram.testSuccess": { EN: "Test message sent!", HT: "Mesaj tès voye!" },

  // Onboarding categories
  "cat.coreAcademics": { EN: "Core Academics", HT: "Akademik Prensipal" },
  "cat.languageLab": { EN: "Language Lab", HT: "Lab Lang" },
  "cat.techSkills": { EN: "Tech Skills", HT: "Konpetans Teknik" },
  "cat.creativeArts": { EN: "Creative Arts", HT: "A Kreyatif" },
  "cat.physicalEd": { EN: "Physical Ed", HT: "Edikasyon Fizik" },

  // Schedule
  "schedule.addBlock": { EN: "Add Block", HT: "Ajoute Blòk" },
  "schedule.editBlock": { EN: "Edit Block", HT: "Modifye Blòk" },
  "schedule.bulkUpload": { EN: "Bulk Upload", HT: "Chaje an Mas" },
  "schedule.noBlocks": { EN: "No blocks scheduled for today", HT: "Pa gen blòk pou jodi a" },
  "schedule.date": { EN: "Date", HT: "Dat" },
  "schedule.start": { EN: "Start", HT: "Kòmansman" },
  "schedule.end": { EN: "End", HT: "Fen" },
  "schedule.subject": { EN: "Subject", HT: "Matyè" },
  "schedule.blockOrder": { EN: "Block Order", HT: "Lòd Blòk" },

  // Misc
  "loading": { EN: "Loading...", HT: "Ap chaje..." },
  "noAlerts": { EN: "No alerts", HT: "Pa gen alèt" },
  "helpNeeded": { EN: "Help Needed", HT: "Bezwen Èd" },
  "done": { EN: "Done", HT: "Fini" },
  "remaining": { EN: "Remaining", HT: "Rete" },
  "complete": { EN: "Complete", HT: "Konplè" },
  "thisWeek": { EN: "This Week", HT: "Semèn sa a" },
  "streak": { EN: "Streak", HT: "Seri" },

  // Signup
  "signup.adultConfirmation": { EN: "I confirm I am 18 years of age or older and am the parent or legal guardian of the students I will manage on this platform.", HT: "Mwen konfime ke mwen gen 18 an oswa plis epi mwen se paran oswa gadyen legal elèv yo ke mwen pral jere sou platfòm sa a." },

  // Privacy & Terms
  "privacy.title": { EN: "Privacy Policy", HT: "Politik Konfidansyalite" },
  "terms.title": { EN: "Terms of Service", HT: "Kondisyon Sèvis" },

  // Profile
  "profile.deleteAccount": { EN: "Delete My Account", HT: "Efase Kont Mwen" },
  "profile.deleteAccountConfirm": { EN: "Type DELETE to confirm", HT: "Tape DELETE pou konfime" },

  // Offline
  "offline.indicator": { EN: "You are offline", HT: "Ou pa gen entènèt" },
  "offline.savedLocally": { EN: "Saved locally", HT: "Sove lokalman" },
  "offline.willSync": { EN: "Will sync when reconnected", HT: "Ap senkronize lè ou rekonekte" },
  "offline.actionsQueued": { EN: "actions queued", HT: "aksyon nan keu" },

  // Onboarding
  "onboarding.stepOf": { EN: "Step {current} of {total}", HT: "Etap {current} nan {total}" },
  "onboarding.step.welcome": { EN: "Welcome", HT: "Byenvini" },
  "onboarding.step.verify": { EN: "Verify Email", HT: "Verifye Imèl" },
  "onboarding.step.addStudent": { EN: "Add Student", HT: "Ajoute Elèv" },
  "onboarding.step.configureTracks": { EN: "Set Up Subjects", HT: "Konfigire Matyè" },
  "onboarding.step.notifications": { EN: "Notifications", HT: "Notifikasyon" },
  "onboarding.skipForNow": { EN: "Set up later", HT: "Konfigire pita" },
  "dashboard.notificationIncomplete": { EN: "Notifications not set up yet", HT: "Notifikasyon pa konfigire ankò" },
  "dashboard.setupNow": { EN: "Set up now", HT: "Konfigire kounye a" },

  // Rewards suggestions
  "rewards.suggestions.movieNight": { EN: "Movie Night", HT: "Sware Fim" },
  "rewards.suggestions.screenTime": { EN: "Extra Screen Time", HT: "Tan Ekran Anplis" },
  "rewards.suggestions.iceCream": { EN: "Ice Cream Trip", HT: "Ale Pran Krèm" },
  "rewards.suggestions.stayUpLate": { EN: "Stay Up Late", HT: "Rete Leve Ta" },
  "rewards.suggestions.chooseDinner": { EN: "Choose Dinner", HT: "Chwazi Dine" },
  "rewards.suggestions.extraGameTime": { EN: "Extra Game Time", HT: "Tan Jwèt Anplis" },
  "rewards.suggestions.dayTrip": { EN: "Day Trip", HT: "Pwomnad Jounen" },
  "rewards.suggestions.newBook": { EN: "New Book", HT: "Nouvo Liv" },
  "rewards.suggestions.sent": { EN: "Suggestion sent to parent!", HT: "Sijesyon voye bay paran!" },
  "rewards.empty.inspirationTitle": { EN: "Reward Ideas 💡", HT: "Ide Rekonpans 💡" },

  // Accessibility
  "a11y.skipToContent": { EN: "Skip to main content", HT: "Ale nan kontni prensipal" },
  "a11y.statsBar": { EN: "Student statistics", HT: "Estatistik elèv" },
  "a11y.studentPhoto": { EN: "Photo of", HT: "Foto de" },
  "a11y.defaultAvatar": { EN: "Default student avatar", HT: "Avatar elèv pa defo" },

  // Notification settings
  "settings.notifications.title": { EN: "Notification Settings", HT: "Paramèt Notifikasyon" },
  "settings.whatsapp.enable": { EN: "Enable WhatsApp", HT: "Aktive WhatsApp" },
  "settings.whatsapp.number": { EN: "WhatsApp Number", HT: "Nimewo WhatsApp" },
  "settings.whatsapp.invalidFormat": { EN: "Invalid WhatsApp number format", HT: "Fòma nimewo WhatsApp envalid" },
  "settings.channel.telegram": { EN: "Telegram", HT: "Telegram" },
  "settings.channel.whatsapp": { EN: "WhatsApp", HT: "WhatsApp" },
  "settings.channel.both": { EN: "Both", HT: "Tou de" },

  // AI
  "ai.rateLimitExceeded": { EN: "Hourly limit reached for Mr A", HT: "Limit èdtan rive pou Mr A" },
  "ai.rateLimitReset": { EN: "Resets at", HT: "Reyinisyalize a" },
  "ai.clearHistory": { EN: "Clear History", HT: "Efase Istwa" },
  "ai.clearHistoryConfirm": { EN: "Clear all conversation history?", HT: "Efase tout istwa konvèsasyon?" },

  // MFA
  "mfa.enable": { EN: "Enable Two-Factor Authentication", HT: "Aktive Otantifikasyon De Faktè" },
  "mfa.description": { EN: "Add an extra layer of security to your account", HT: "Ajoute yon kouch sekirite anplis nan kont ou" },
  "mfa.scanQR": { EN: "Scan this QR code with your authenticator app", HT: "Eskanye kòd QR sa a ak aplikasyon otantifikatè ou" },
  "mfa.enterCode": { EN: "Enter the 6-digit code", HT: "Antre kòd 6 chif la" },
  "mfa.enabled": { EN: "Two-factor authentication is enabled", HT: "Otantifikasyon de faktè aktive" },
  "mfa.protected": { EN: "Account Protected", HT: "Kont Pwoteje" },
  "mfa.disable": { EN: "Disable MFA", HT: "Dezaktive MFA" },

  // Block actions
  "block.start": { EN: "Start Block", HT: "Kòmanse Blòk" },
  "block.markDone": { EN: "Mark Done", HT: "Make Fini" },

  // Nav
  "nav.openMenu": { EN: "Open menu", HT: "Louvri meni" },
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
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("im_lang");
    return (saved === "HT" ? "HT" : "EN") as Lang;
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("im_lang", l);
  }, []);

  const t = useCallback((key: string) => translations[key]?.[lang] || translations[key]?.["EN"] || key, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
export type { Lang };
