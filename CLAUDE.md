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
- [ ] T4: /refund page + failed-login tracking + payment alerts
- [ ] T5: Stripe billing (schema → webhooks → gating → UI)

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
2026-07-12 — T3 Enforce sender policy — queue sender locked to default, ops alerts sender allowlisted, lint/tsc passed.
2026-07-12 — T2 Normalize apex→www — canonical www email template URLs set and dns-monitor now checks apex plus www; lint/tsc passed.
2026-07-12 — T1 Remove Lovable remnants — removed remaining scoped Lovable refs, dropped bun.lock, self-hosted OG image, validations passed.