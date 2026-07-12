# Activity Log

## 2026-07-12 — T3 Enforce sender policy
- Summary: Enforced the queue sender policy by adding an explicit allowlist, warning on disallowed `payload.from` values, and always sending queued mail as `Independent Minds EDU <noreply@independentmindsedu.org>`. Confirmed the ops-only `alerts@notify.independentmindsedu.org` sender used by dns-monitor is present in the allowlist.
- Files touched: `supabase/functions/process-email-queue/index.ts`, `CLAUDE.md`, `docs/ACTIVITY_LOG.md`
- Validation: `npm run lint` PASS; `npx tsc --noEmit` PASS; on-disk sender scan confirmed both the default sender and `Independent Minds EDU Alerts <alerts@notify.independentmindsedu.org>` in the expected files.
- Risks + rollback: Revert the T3 commit to restore queue behavior that forwards `payload.from`; no schema or deployment-side changes were introduced.
- Blockers/human actions needed: None.

## 2026-07-12 — T2 Normalize apex→www
- Summary: Normalized generated auth email template URLs to the canonical `https://www.independentmindsedu.org` value and expanded DNS monitoring to track both the apex domain and the canonical `www` hostname without dropping apex redirect coverage.
- Files touched: `supabase/functions/auth-email-hook/index.ts`, `supabase/functions/dns-monitor/index.ts`, `CLAUDE.md`, `docs/ACTIVITY_LOG.md`
- Validation: `npm run lint` PASS; `npx tsc --noEmit` PASS; local on-disk scan for `https://independentmindsedu.org` inside `supabase/functions/` returned no results.
- Risks + rollback: Revert the T2 commit to restore the previous single-domain DNS monitor and apex-based auth email template URL generation.
- Blockers/human actions needed: None.

## 2026-07-12 — T1 Remove Lovable remnants
- Summary: Removed the remaining scoped Lovable remnants for T1 by deleting the unused Bun lockfile, regenerating npm lock metadata, and replacing the Lovable-hosted social preview image with a self-hosted `og-image.png` copied from the existing PWA asset.
- Files touched: `index.html`, `package-lock.json`, `public/og-image.png`, `bun.lock`, `CLAUDE.md`, `docs/ACTIVITY_LOG.md`
- Validation: `npm run lint` PASS; `npx tsc --noEmit` PASS; `npm run build` PASS; `npm test` PASS (87/87); scoped Lovable grep over `src/ public/ index.html package.json vite.config.ts` returned 0 hits; Vite dev server booted successfully on `http://localhost:8080/`.
- Risks + rollback: Revert the T1 commit to restore the previous lockfiles and OG image metadata; if Bun is reintroduced later, regenerate a fresh `bun.lock` from the new package manager workflow.
- Blockers/human actions needed: None.