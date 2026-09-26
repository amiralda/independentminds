# Independent Minds EDU — Agent Context

## Stack
React + TS + Vite + Tailwind + shadcn/ui. 
Supabase (Postgres/Auth/Edge Functions). Vercel hosting.
Canonical URL: https://www.independentmindsedu.org (www, not apex)

## Key paths
- Auth: src/contexts/AuthContext.tsx, src/lib/oauth.ts, 
  src/lib/siteUrl.ts, src/pages/AuthCallback.tsx
- Email functions: supabase/functions/send-transactional-email, 
  auth-email-hook, process-email-queue
- Error tracking: src/lib/errorTracker.ts, 
  supabase/functions/track-error
- i18n: single file, ~800 keys, 10 languages (EN,HT,FR,ES,PT,AR,ZH,DE,JA,RU)
- Monitoring: supabase/functions/hourly-monitor

## Rules
- Never hardcode secrets; env vars only (VITE_* = client-safe)
- Sender: "Independent Minds EDU <noreply@independentmindsedu.org>"
- All generated URLs use www (never apex)
- Small reversible commits on branches, never direct to main
- Validation for non-trivial changes: lint + tsc --noEmit + build
- New user-facing strings need i18n keys in all 10 languages

## Launch plan status (update after each task)
- [x] T1: Remove Lovable remnants
- [x] T2: Normalize apex→www in auth-email-hook + dns-monitor
- [x] T3: Enforce sender policy in process-email-queue
- [x] T4: /refund page + failed-login tracking + payment alerts
- [x] T5: Stripe billing (schema → webhooks → gating → UI)
- [x] T6: Milestone 3 — RLS & auth audit (recursion check, cross-family isolation, server-side paywall gates for AI tutor + weekly reports)

## Stripe live-mode gate (decided 2026-08-30, do not flip without user sign-off)
Staying on `pk_test_...` (Vercel) / `sk_test_...` (Supabase) deliberately.
Do NOT swap to `pk_live_...`/`sk_live_...` until ALL 5 are done:
- [x] Email DNS corrected (2026-09-24 — confirmed by the user: Resend domain independentmindsedu.org verified and a real test send succeeded in a separate session; corroborated here by production messages_log: daily cron emails status 'sent' since 2026-09-21, 0 'failed' in the last 3 days — see docs/ACTIVITY_LOG.md)
- [x] Supabase failure rate investigated (2026-08-30 — root causes identified, not yet fixed; see docs/ACTIVITY_LOG.md)
- [x] `search_path` fixed on `has_role`, `handle_new_user`, `rls_auto_enable` (confirmed already locked down 2026-09-06 from a prior session; also closed anon/PUBLIC RPC exposure on all 3 this session — see ACTIVITY_LOG)
- [ ] Final pricing/terms review completed
- [x] AI Tutor actually working (2026-09-22 — final decision: OpenAI direct (Dany's own account), not Lovable's gateway or OpenRouter. Model `gpt-4.1`. `ai-tutor` migrated off `google/gemini-2.5-flash`, `AI_GATEWAY_URL`/`AI_GATEWAY_API_KEY` now point at a real OpenAI account, live-tested end to end against the deployed function — 200, real streaming response, `model` field confirmed `gpt-4.1-2025-04-14`. `extract-schedule` (shares the same secrets, not currently deployed) fixed to the same model in source for consistency — see docs/ACTIVITY_LOG.md)
When all 5 are checked, confirm with user before touching live keys.

## Audit findings (Apr 2026, do not re-audit)
Build/lint/tests: PASS (87/87). No secrets committed. 
No .com remnants. Billing: MISSING entirely. 
Details: docs/AUDIT_REPORT.md

## Logging rule (mandatory after EVERY completed task)
After finishing any task, before reporting done:
1. Update the launch-plan checkbox in this file 
  and add ONE line under "Recent" below 
  (format: date — task — result). 
  Keep max 5 lines in Recent; move older 
  lines to docs/ACTIVITY_LOG.md.
2. Append a full entry to docs/ACTIVITY_LOG.md:
  ## [date] — [task name]
  - Summary: what changed and why
  - Files touched: list
  - Validation: lint/tsc/build/test results
  - Risks + rollback: how to revert
  - Blockers/human actions needed: if any
Never skip this step. Never put long logs in 
CLAUDE.md — details go in ACTIVITY_LOG.md only.

## Recent
2026-09-26 — Client-side min password 8 — Done: shared MIN_PASSWORD_LENGTH=8 in signup (had none) + ResetPassword (was 6), message updated in 10 languages; E2E: 7 chars refused, nothing sent to Auth. Server-side rules: CLOSED — Limit konfime plan Supabase Free — mande upgrade Pro pou rezoud. See docs/ACTIVITY_LOG.md.
2026-09-26 — Diagnostic doc + .gitignore — Done: docs/DIAGNOSTIC_2026-08-30.md committed (retired bearer token redacted first; verified unused), supabase/.temp/ ignored. Working tree clean. See docs/ACTIVITY_LOG.md.
2026-09-26 — Task 1: reminder fns committed — Done: the 4 live cron functions (running since 08-30, never committed) are now in the repo, lint fixed (no-op if/else); deployed source verified identical. First fully clean `npm run lint`; tsc/build/96 tests PASS. See docs/ACTIVITY_LOG.md.
2026-09-26 — CRON_SECRET rotated — Done: new value in Edge secrets (user) + Vault `cron_secret`; 4 cron jobs read it from Vault (no literal secret in cron/migrations/git). Curl: old leaked secret 401 on all 4, new secret 200 (weekly-badge, 0 emails), cron Vault path 200. See docs/ACTIVITY_LOG.md.
2026-09-25 — Security audit + fixes (direct-to-main exception, this session only) — Done: CRITICAL test-faz1-fixture (delete-any-user, guarded by the leaked CRON_SECRET) neutralized; ai-tutor rate limit RPC created (was failing open); security headers; track-auth-failure flood cap; has_role/get_managed_parent_ids caller-only, trigger RPCs revoked, server-only student linking, dup-check cap, photo bucket limits; .env.test untracked, secret redacted. All live-tested, cleaned. CLOSED 2026-09-26: server min length + leaked-password protection = Limit konfime plan Supabase Free — mande upgrade Pro pou rezoud (client-side min 8 in place; CRON_SECRET rotated 2026-09-26). See docs/ACTIVITY_LOG.md.
