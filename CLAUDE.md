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
2026-09-24 — Remove admin "view as student" — Done: can_impersonate_student() admin branch removed (blocks view-as log + create-student-account for admins), 5 view-as-only admin read policies dropped, AdminStudents button removed, account-merge self-approval blocked (fn not deployed). Live: admin 403 everywhere; parent/Manager/co-guardian/admin+parent own-family unchanged. See docs/ACTIVITY_LOG.md.
2026-09-24 — Email DNS confirmed — Done: user confirmed Resend domain verified + real test send succeeded (separate session); messages_log shows production cron emails 'sent' daily since 2026-09-21, 0 failed. Stripe gate now 4/5 checked (only pricing/terms review open). See docs/ACTIVITY_LOG.md.
2026-09-24 — Student login accounts + working 'student' role + audited view-as — Done: students.user_id, server-side invites (never metadata), student RLS (own data only; own row writes = photo only via trigger), impersonation_logs (log-first, server-stamped), create-student-account fn, ai-tutor student branch, Manager/admin view-as, AdminStudents updated_at fix. 40+ live API + browser E2E checks PASS, test data cleaned. COPPA: first layer only, lawyer review required before real under-13 use. See docs/ACTIVITY_LOG.md.
2026-09-23 — selectedStudentId = student uuid everywhere — Done: DadPanel/StudentSwitcherDropdown/StudentSelector/Index/TelegramSettings/add-student flows used the text student_id label (no highlight, hidden top card, per-student tabs 400 after a menu pick); now uuid, stale/legacy selection auto-repaired. Real-browser E2E before/after PASS. Found, not fixed: Admin Students tab selects nonexistent students.updated_at (400 → empty list). See docs/ACTIVITY_LOG.md.
2026-09-23 — Fix multi-role accounts shown as "student" — Done: AuthContext read user_roles with .maybeSingle() (errors on 2+ rows → silent 'student' fallback, hit Dany/Aristilde/test-admin on any fresh browser); now reads all rows via resolvePrimaryRole() (parent first, student only if that's all). Real-browser E2E: bug reproduced on prod, fixed build → parent; student-only → student. See docs/ACTIVITY_LOG.md.
