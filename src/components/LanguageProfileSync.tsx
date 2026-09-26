import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { fromDbLang, initialLanguageAction, toDbLang } from "@/lib/languagePref";

/**
 * Keeps the UI language and profiles.language_pref in sync for signed-in users:
 * 1. once per sign-in, the saved profile language is applied (so it survives
 *    logout/login and new devices, not only this browser's localStorage);
 * 2. from then on, every language change in the app is saved to the profile,
 *    whichever picker made it.
 */
export function LanguageProfileSync() {
  const { session, profile, updateProfile } = useAuth();
  const { lang, setLang } = useI18n();
  const userId = session?.user?.id ?? null;
  // State, not a ref: step 2 must only start on the render after step 1 has
  // applied the profile language, or it would save the stale local one.
  const [readyFor, setReadyFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setReadyFor(null);
      return;
    }
    // An empty languagePref means the profile could not be read: do nothing.
    if (!profile?.languagePref || readyFor === userId) return;
    const action = initialLanguageAction(profile.languagePref, profile.onboardingComplete, lang);
    if (action.type === "apply") setLang(action.lang);
    setReadyFor(userId);
    // lang is read once here on purpose; later changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile, readyFor, setLang]);

  useEffect(() => {
    if (!userId || readyFor !== userId || !profile?.languagePref) return;
    if (fromDbLang(profile.languagePref) === lang) return;
    updateProfile({ language_pref: toDbLang(lang) }).catch(() => {});
    // updateProfile is recreated every render; profile/lang drive this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, userId, readyFor, profile]);

  return null;
}
