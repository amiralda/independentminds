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

## Future Features (documented only — NOT started; plan each separately before any code)

### FF1 — Marketing / showcase site on www, platform moves to a subdomain
- Goal: a visitor landing on www.independentmindsedu.org sees an information/sales page explaining IME's services — **Homeschool Platform, Tutoring, Cours Privé** — before reaching login/dashboard. A "Login" button leads to the current platform, moved to a subdomain such as app.independentmindsedu.org.
- Known impact to plan for (from the current codebase):
  - The "www is canonical" rule above changes: www = marketing, app. = platform. `Login.tsx` redirects apex→www today.
  - ~24 edge functions hardcode `https://www.independentmindsedu.org` (invite/reset links, `redirectTo`, Stripe success/cancel/return URLs, email templates) → all must point to the app subdomain.
  - Supabase Auth Site URL + Redirect URLs allowlist, Google OAuth redirect URIs, Stripe dashboard URLs, Vercel domains, `VITE_SITE_URL`, `src/lib/siteUrl.ts`, canonical/OG tags in `index.html`, and the security headers in `vercel.json` must follow.
  - Existing links already sent (student/co-guardian invites, reset emails) point to www → www should redirect platform paths (/login, /reset-password, /accept-invite, /auth/callback…) to app. during the transition.

### FF2 — Affiliate / dropshipping store as an extension of rewards_catalog
- Each catalog item gets an **image**, an **affiliate link** (Amazon Associates or similar) and a **reference USD price** used to convert to points.
- Flow: student requests the item (same `redeem_reward` mechanism) → parent/Manager approves (points are committed) → parent/Manager clicks the affiliate link **manually** and buys on their own account/card.
- Out of scope by design: no inventory, no shipping, no Stripe payments handled by IME — IME only earns the affiliate commission.
- Known impact to plan for (from the current codebase):
  - Today `redeem_reward()` debits points **at request time** (status 'pending'), and `reward_redemptions.status` only allows pending/approved/redeemed — there is no reject/refund.
  - **DECIDED 2026-09-26 (user): Option 1 — points are debited only when the parent/Manager approves, never when the student requests.** Split `redeem_reward` into two steps:
    - *Request* (student or family): creates the `pending` redemption with the server price snapshot; **does not touch points** (a soft balance check is fine for UX, but it is not a reservation).
    - *Approval* (parent/Manager/co-guardian only): re-checks the balance and inserts the negative `reward_points` debit in the same transaction under the per-student row lock, then marks it approved. If the balance is now too low (other requests approved meanwhile) → refuse, nothing debited.
    - Add a *decline* status for requests the parent refuses (no refund needed, since nothing was debited). Existing pending rows created under the old debit-at-request rule must be handled in the migration (they are already debited).
    - Why: the student's balance stays intact until an adult actually commits to buying; declined or forgotten requests never cost points and never need refunds.
  - Schema additions (additive): image URL/storage path, affiliate URL, reference USD price + a points-per-dollar rate (per family or global); an image bucket with the same limits as `student-photos`.
  - Affiliate links should be shown to parents/Managers only (not student accounts — minors/COPPA); Amazon Associates requires an affiliate disclosure on the page.

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
2026-09-26 — DNS Status false alarm fixed — Done: old Lovable IP 185.158.133.1 removed from panel, setup wizard (its instructions would have broken the site) and dns-monitor source; shared lib/dnsExpected (root A 216.198.79.1/64.29.17.1, www CNAME Vercel). Panel now "Resolving"/All checks passing; 104 tests PASS. See docs/ACTIVITY_LOG.md.
2026-09-26 — admin_notifications created — Done: table + RLS (own rows, UPDATE is_read only, server-only writes) + Realtime; admin 404 gone; alert count fixed (was always 0); bell live via one shared channel (duplicate bindings dropped events). API+security+browser E2E PASS, cleaned. See docs/ACTIVITY_LOG.md.
2026-09-26 — FF2 decision recorded — Done: affiliate store will debit points only at parent/Manager approval (split request vs approval in redeem_reward); docs only. See CLAUDE.md "Future Features".
2026-09-26 — Future Features documented — Done: FF1 marketing site on www + platform on app. subdomain, FF2 affiliate store on rewards_catalog (docs only, not started). See CLAUDE.md "Future Features".
2026-09-25 — Security audit + fixes (direct-to-main exception, this session only) — Done: CRITICAL test-faz1-fixture (delete-any-user, guarded by the leaked CRON_SECRET) neutralized; ai-tutor rate limit RPC created (was failing open); security headers; track-auth-failure flood cap; has_role/get_managed_parent_ids caller-only, trigger RPCs revoked, server-only student linking, dup-check cap, photo bucket limits; .env.test untracked, secret redacted. All live-tested, cleaned. CLOSED 2026-09-26: server min length + leaked-password protection = Limit konfime plan Supabase Free — mande upgrade Pro pou rezoud (client-side min 8 in place; CRON_SECRET rotated 2026-09-26). See docs/ACTIVITY_LOG.md.
