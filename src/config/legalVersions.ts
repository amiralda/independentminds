/**
 * Versions of the published legal documents.
 *
 * These values are recorded with every signup (in auth metadata, and mirrored
 * into `public.legal_consents`), so they are the record of what a user actually
 * agreed to.
 *
 * WHEN A DOCUMENT CHANGES:
 *  1. Edit the page in `src/pages/` and raise the version here.
 *  2. Update the "Version x.y" line shown in that page's header.
 *  3. If the change is material, email existing users at least 30 days before
 *     it takes effect — Terms §17 and Privacy §18 both promise that.
 *
 * Raising a version here does not re-prompt existing users. That is a separate
 * piece of work (a re-consent flow) and is not built yet.
 */
export const LEGAL_VERSIONS = {
  terms: "1.0",
  privacy: "1.0",
  refund: "1.0",
} as const;

export type LegalDocument = keyof typeof LEGAL_VERSIONS;
