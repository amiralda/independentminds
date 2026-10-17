import { useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useLegalConsent } from "@/hooks/useLegalConsent";
import { renderLegalLinks } from "@/lib/legalLinks";

/**
 * Blocking consent gate for accounts that predate the published legal text.
 *
 * The Terms and Privacy Policy went live on 2026-10-17 and bind every user, but
 * accounts created before that never accepted them. This asks each adult once,
 * at their next sign-in, and records it in legal_consents.
 *
 * Three deliberate properties:
 *
 *  - It cannot be dismissed. AlertDialog is used rather than Dialog precisely
 *    because it has no close button and does not close on an outside click or
 *    Escape. A gate a user can wave away records nothing while looking like
 *    consent was obtained, which is worse than no gate at all.
 *
 *  - The accept button stays disabled until the box is ticked, so acceptance is
 *    always a deliberate act rather than a reflex click.
 *
 *  - There is still a way out. Someone who does not want to accept can sign
 *    out, and is told how to export their data or close the account. Terms 4.5
 *    and Refund Policy 1.7 promise their records are not held hostage; trapping
 *    a family behind this dialog would break that promise on the same day the
 *    promise was published.
 *
 * Students never see it: they are minors, their parent consents for them
 * (Terms 1.3, Privacy 2.1), and accept_legal_documents refuses a student caller
 * even if a modified client tried. See useLegalConsent.
 */
/**
 * Pages the gate must never cover.
 *
 * The consent checkbox links to /terms and /privacy in a NEW TAB. Without this
 * list the gate would render on top of the very documents it is asking the user
 * to read — they would be told to read something they cannot see. The public
 * auth pages are here too: there is no signed-in user to ask on them.
 */
const GATE_FREE_PATHS = new Set([
  "/terms", "/privacy", "/refund",
  "/login", "/forgot-password", "/reset-password",
  "/accept-invite", "/unsubscribe",
]);

export function LegalConsentGate() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { ready, mustAccept, accept } = useLegalConsent();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (GATE_FREE_PATHS.has(normalized)) return null;
  if (!ready || !mustAccept) return null;

  const onAccept = async () => {
    setSaving(true);
    const ok = await accept();
    setSaving(false);
    if (!ok) toast.error(t("legal.gate.error"));
  };

  return (
    <AlertDialog open>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{t("legal.gate.title")}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm text-foreground/80 leading-relaxed">
          <p>{t("legal.gate.body")}</p>

          <label htmlFor="legal-gate-accept" className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              id="legal-gate-accept"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <span className="text-xs leading-tight">
              {renderLegalLinks(t("auth.consent.label"), t("terms.title"), t("privacy.title"))}
            </span>
          </label>

          <Button
            className="w-full font-display"
            disabled={!checked || saving}
            onClick={onAccept}
          >
            {saving ? t("legal.gate.saving") : t("legal.gate.accept")}
          </Button>

          <p className="text-xs text-muted-foreground">
            {t("legal.gate.declineHelp")}{" "}
            <button
              type="button"
              className="underline hover:text-primary"
              onClick={() => void supabase.auth.signOut()}
            >
              {t("action.signOut")}
            </button>
          </p>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default LegalConsentGate;
