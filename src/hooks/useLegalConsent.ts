import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LEGAL_VERSIONS } from "@/config/legalVersions";

/**
 * Whether the signed-in user still owes an acceptance of the current legal
 * documents, and the call that records one.
 *
 * Students are never asked. They are minors; their parent consents for them
 * (Terms 1.3, Privacy 2.1), and the database refuses to file a student's own
 * acceptance even if a client tried. Every other role — parent, co-guardian,
 * manager, educator, admin — resolves to a non-student primary role and is
 * asked once per document version.
 *
 * "Still owes" means: no row in legal_consents for the version in
 * LEGAL_VERSIONS. So when the lawyer's update lands and that file is bumped to
 * 1.1, the gate re-opens by itself for everyone, with no migration and no code
 * change here.
 */
export interface LegalConsentState {
  /** True once we know the answer. Nothing is shown before then. */
  ready: boolean;
  /** True when a blocking consent gate should be displayed. */
  mustAccept: boolean;
  /** Records acceptance of the current versions. Resolves true on success. */
  accept: () => Promise<boolean>;
}

export function useLegalConsent(): LegalConsentState {
  const { user, profile, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [mustAccept, setMustAccept] = useState(false);

  const isStudent = profile?.role === "student";
  // Depend on the id, never the user OBJECT. A new object identity on every
  // render — which is what a context returning `session?.user` can produce —
  // re-runs this effect, re-reads the old consent rows and re-opens the gate
  // the instant someone accepts. Caught by the "records both documents" test.
  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    // Wait for auth to settle; signed-out visitors and students are never gated.
    if (loading) return;
    if (!userId || isStudent) {
      setMustAccept(false);
      setReady(true);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("legal_consents")
        .select("document, version")
        .eq("user_id", userId);

      if (cancelled) return;

      if (error) {
        // A failed read must not lock anyone out of their own account. Stay
        // closed and try again on the next sign-in rather than gate on a guess.
        console.error("[legal-consent] could not read consent state:", error.message);
        setMustAccept(false);
        setReady(true);
        return;
      }

      const rows = data ?? [];
      const has = (doc: string, version: string) =>
        rows.some((r) => r.document === doc && r.version === version);

      setMustAccept(
        !has("terms", LEGAL_VERSIONS.terms) || !has("privacy", LEGAL_VERSIONS.privacy),
      );
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, userId, isStudent]);

  const accept = useCallback(async () => {
    const { error } = await supabase.rpc("accept_legal_documents", {
      p_terms_version: LEGAL_VERSIONS.terms,
      p_privacy_version: LEGAL_VERSIONS.privacy,
    });
    if (error) {
      console.error("[legal-consent] could not record acceptance:", error.message);
      return false;
    }
    setMustAccept(false);
    return true;
  }, []);

  return { ready, mustAccept, accept };
}
