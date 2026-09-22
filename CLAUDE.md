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
- [ ] Email DNS corrected
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
2026-09-22 (3rd follow-up) — Built Monitor role (user_roles CHECK + monitor_parents table + monitor-create-parent edge function) and made co-guardian access actually work backend-side (get_managed_parent_ids() helper reused by both, 13 "parent manages X" policies rewritten to route through it). subscriptions gained a marker-only covered_by_monitor_id column (3 NOT NULLs relaxed, no Stripe/webhook code touched). Fixed the 2 requested uuid/text bugs in AddStudentFullForm.tsx/StudentProfileCard.tsx, plus 2 more of the same category found while testing (daily_plan's real column is planned_date not plan_date, and its status CHECK only allows lowercase planned/started/done). Co-guardian's OWN invite mechanism (send-guardian-invite/accept-guardian-invite + CoGuardiansPanel.tsx UI) is separately broken against a different schema shape entirely — deliberately deferred to a future session per user's explicit call; RLS access is correct for whatever co_guardians rows exist regardless. Live-tested every access path (monitor↔family data, monitor✗co_guardians, parent's independent co-guardian control, co-guardian↔family data) with real accounts, all test data cleaned up. See docs/ACTIVITY_LOG.md.
2026-09-22 (2nd follow-up) — Fixed "Could not find the 'address' column of 'students'" on student creation: same root cause as grade_level (project rebuilt without full old migration history) but 9 columns wide this time. New migration restores date_of_birth/nationality/address/profile_photo_url/enrollment_date/academic_year/parent_name/parent_email/parent_whatsapp on students, plus learning_tools table and student-photos storage bucket (rebuilt as private, not public like the old migration — matches what studentPhoto.ts already assumes). Also fixed AddStudentFullForm.tsx not sending the nationality field it collects. Live-tested via real REST insert with test-parent's JWT: 201, all fields saved. Found (not fixed, flagged): AddStudentFullForm's subject_tracks/daily_plan inserts still send the text student_id label where both columns are now uuid — same class of bug as the ai-tutor/daily_plan uuid fixes earlier, silently no-ops (caught, non-fatal) so student creation itself still succeeds. Also flagged: StudentProfileCard.tsx queries students by the text student_id label while callers pass the uuid id — profile view/edit likely returns no rows. See docs/ACTIVITY_LOG.md.
2026-09-22 — AI Tutor provider migration: ai-tutor + extract-schedule switched from Lovable gateway/gemini-2.5-flash to OpenAI gpt-4.1 (user's own OpenAI account). Endpoint/request/SSE format already matched OpenAI's standard shape, so only the model string changed. AI_GATEWAY_URL/AI_GATEWAY_API_KEY repointed at real OpenAI values; ai-tutor deployed (v4) and live-tested end to end with the test-parent fixture — real streaming gpt-4.1 response confirmed. Closes the last open Stripe live-mode gate item on AI Tutor. Found (not fixed, out of scope): ai_conversations table's real schema (id/student_id/subject/messages jsonb/updated_at) doesn't match what ai-tutor reads/writes (role/content/created_at columns) — history load and message persistence silently no-op; core chat response unaffected. See docs/ACTIVITY_LOG.md.
2026-09-07 (Milestone 3 follow-up) — Confirmed AI Tutor is live, public, checkmarked copy on /pricing (Pricing.tsx renders config/plans.ts highlights, unauthenticated route) at every tier including Basic — traced AI_GATEWAY_API_KEY/AI_GATEWAY_URL via git blame to a pure rename of the original LOVABLE_API_KEY/hardcoded ai.gateway.lovable.dev (2026-07-10, "gateway neutral migration") — no new provider was ever actually wired in. Added as a 5th Stripe live-mode gate condition since no real customers exist yet (still test-mode) but this must be resolved before going live. Provider decision deferred to next session. See docs/ACTIVITY_LOG.md.
2026-09-07 (Milestone 3) — RLS/auth audit (read-only) then fixed both confirmed server-side gaps: added a subscription check to ai-tutor and built a new weekly-report-data edge function to gate WeeklyProgressReport/ReportsPanel the same way. Along the way found + fixed ai-tutor's role/ownership checks were ALSO broken (profiles.role/student_id don't exist; wrong join column) — the feature had never actually been deployed before, so this was its first-ever working deploy, not a regression. All 3 fixes committed+pushed+deployed, live-tested (402/403/200 paths confirmed). Audit found zero live RLS recursion risks; cross-family isolation airtight for parents; co-guardian access confirmed non-functional (known gap, safe direction). See docs/ACTIVITY_LOG.md.