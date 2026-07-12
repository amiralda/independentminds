# Activity Log

## 2026-07-12 — T4 Launch ops/legal gaps
- Summary: Added a refund policy page and route, wired lightweight auth-failure telemetry from the login flow into a new edge function and `auth_failures` table, and added hourly-monitor alert scaffolding for auth failure spikes and future Stripe payment failures via a new `billing_events` table.
- Files touched: `src/App.tsx`, `src/pages/Login.tsx`, `src/pages/RefundPolicy.tsx`, `src/lib/i18n.tsx`, `supabase/config.toml`, `supabase/functions/hourly-monitor/index.ts`, `supabase/functions/track-auth-failure/index.ts`, `supabase/migrations/20260712173000_launch_ops_gaps.sql`, `CLAUDE.md`, `docs/ACTIVITY_LOG.md`
- Validation: `npm run lint` PASS; `npx tsc --noEmit` PASS; `npm run build` PASS; `npm test` PASS.
- Risks + rollback: Revert the T4 commit to remove the new legal page, telemetry edge function, alert rules, and schema additions; the migration is additive and isolated to `auth_failures` and `billing_events`.
- Blockers/human actions needed: ES/PT/AR/ZH/DE/JA/RU refund-policy copy currently reuses EN strings by design; replace with localized translations later. Billing webhook population for `billing_events` still depends on T5.

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