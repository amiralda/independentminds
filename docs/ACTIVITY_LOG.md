# Activity Log

## 2026-08-23 — Merge T1-T5 to main + Supabase backend deploy
- Summary: Installed the Supabase CLI (v2.115.0, not authenticated — MCP used instead for DB/function operations). Verified `feat/stripe-billing` at `ea02f0b` contained T1-T5 linearly, not yet merged to `main`. Discovered and fixed a stale/inaccessible Supabase project ref (`wkvattbvybvgaeobtidl`, not in the account's project list) hardcoded in `supabase/config.toml`, `LAUNCH_CHECKLIST.md`, and 6 email template logo/webhook URLs; replaced with the actual active project `gyvjcwuwfwrwwwnuwlex` ("Independent Minds", confirmed via `list_projects`). Fast-forward merged `feat/stripe-billing` into `main` and pushed to `origin/main` (also carried 2 previously-unpushed local `main` commits). Applied 5 migrations to `gyvjcwuwfwrwwwnuwlex` in dependency order: shared `update_updated_at_column()` trigger function and the T4 `20260712173000_launch_ops_gaps` migration (both missing prerequisites discovered because this project had zero tracked migrations despite 29 existing tables), then `20260712190000_stripe_billing_phase1` (`stripe_customers` + `subscriptions`), `20260712193000_stripe_webhook_idempotency`, and `20260712195500_subscriptions_admin_read`. Deployed the 3 Stripe edge functions present in the branch (`create-checkout-session`, `create-portal-session`, `stripe-webhook`) — note: only 3 were found in the branch, not 4.
- Files touched: `supabase/config.toml`, `LAUNCH_CHECKLIST.md`, `supabase/functions/_shared/email-templates/{signup,magic-link,recovery,invite,reauthentication,email-change}.tsx`, `CLAUDE.md`, `docs/ACTIVITY_LOG.md` (git, commit `d600fbc`); remote-only: 5 migrations and 3 edge functions applied directly to project `gyvjcwuwfwrwwwnuwlex` via MCP (not represented as new local migration files since they replay existing ones).
- Validation: `npm run lint` PASS; `npx tsc --noEmit` PASS; `npm run build` PASS (44.52s) — run on the ref-fix commit prior to merge. Post-migration `get_advisors` (security) showed 8 warnings, all pre-existing on functions untouched by this change (`has_role`, `handle_new_user`, `rls_auto_enable`); no new issues introduced.
- Risks + rollback: Git — `main` fast-forwarded from `1e31f38` to `d600fbc`; revert via `git revert` of the range or a hard reset + force-push if truly needed (destructive, requires explicit approval). DB — all 5 migrations are additive only (new tables/columns/policies/function, no drops); rollback = drop `stripe_customers`, `subscriptions`, `billing_events`, `auth_failures`, and function `update_updated_at_column()` if truly unwinding. Edge functions — each deployed as version 1; rollback = delete the function in the dashboard/CLI.
- Blockers/human actions needed: Stripe secrets are still NOT configured on `gyvjcwuwfwrwwwnuwlex` — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PRO` (Edge Function secrets) and `VITE_STRIPE_PUBLISHABLE_KEY` (client build env) per `LAUNCH_CHECKLIST.md` section 1 — all 3 deployed functions will error until these are set. Stripe Dashboard product/price/webhook-endpoint setup also still pending. Optionally run `supabase login` locally if a CLI-based workflow (vs. MCP) is preferred going forward.

## 2026-07-12 — T5 Stripe billing (4 phases)
	- Phase 1: `npm run lint` PASS; `npx tsc --noEmit` PASS.
	- Phase 2: `npm run lint` PASS; `npx tsc --noEmit` PASS.
	- Phase 3: `npm run lint` PASS; `npx tsc --noEmit` PASS.
	- Phase 4: `npm run lint` PASS; `npx tsc --noEmit` PASS.
	- Final: `npm run build` PASS; `npm test` PASS (87/87).
	- Phase 1 rollback: revert `20260712190000_stripe_billing_phase1.sql` and `src/hooks/useSubscription.ts`.
	- Phase 2 rollback: revert `create-checkout-session`, `create-portal-session`, `stripe-webhook`, `supabase/config.toml`, and `20260712193000_stripe_webhook_idempotency.sql`.
	- Phase 3 rollback: revert `src/components/SubscriptionGate.tsx`, `src/components/DadPanel.tsx`, and `src/pages/Index.tsx` to remove premium gating.
	- Phase 4 rollback: revert pricing/billing/admin UI files and route/nav wiring (`src/config/plans.ts`, `src/pages/Pricing.tsx`, `src/pages/Billing.tsx`, `src/pages/admin/AdminBilling.tsx`, `src/App.tsx`, `src/components/admin/AdminLayout.tsx`, `src/lib/i18n.tsx`) and remove admin subscription read policy migration `20260712195500_subscriptions_admin_read.sql`.

## 2026-07-12 — T5 Stripe billing finalization and launch checklist
- Summary: Finalized T5 delivery by replacing the root launch checklist with Stripe-specific setup instructions, env-var destinations, and explicit success/failure smoke tests; prepared all T5 code and docs changes for a single structured commit on `feat/stripe-billing`.
- Files touched: `LAUNCH_CHECKLIST.md`, `CLAUDE.md`, `docs/ACTIVITY_LOG.md` plus T5 implementation files across `src/` and `supabase/`.
- Validation: Prior T5 validations remained green (`npm run lint` PASS; `npx tsc --noEmit` PASS after final edits; `npm run build` PASS; `npm test` PASS).
- Risks + rollback: Revert the T5 commit to remove all Stripe billing schema, functions, gating, pricing/billing/admin UI, and launch checklist updates in one step.
- Blockers/human actions needed: Stripe Dashboard setup still required (products/prices, webhook endpoint/events, restricted key, portal config, and env var provisioning).

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