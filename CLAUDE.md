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

### FF3 — Self-monitoring with a proposed-fix journal
- Goal: when the monitoring (hourly-monitor, track-error, dns-monitor, cron failures…) detects a problem, write an entry to a journal — table or file — with the evidence, a diagnosis and a **proposed** fix, so the next Claude Code session can review it and apply it through the normal process. An automated version of the first part of the "Phase 1-3 monitoring" idea discussed on 2026-09-26.
- High-level shape: a `fix_proposals` journal (admin-only RLS, service-role writes) fed by the existing signals (admin_notifications types, platform_errors spikes, net._http_response failures of cron jobs, Supabase advisors); each entry = source, first/last seen, count, evidence, suspected cause, proposed change, status (open / applied / rejected / duplicate). The admin panel could list them.
- Guardrails to keep: proposals only — never auto-apply code or DB changes; dedup by signature; redact secrets/PII from evidence; the usual approval + validation + E2E rules still apply to every fix.
- Already in place to build on: admin_notifications (+ Realtime bell), hourly-monitor rules, track-error, dns-monitor history, crons reading secrets from Vault.

### FF4 — Multilingual user manual, easy to find, kept up to date
- Goal: make the user manual (4 PDF versions exist: EN / FR / ES / HT) easy to reach inside the platform — e.g. a "Help / Aide / Ayuda / Èd" link in the menu that opens the version matching the user's language — and keep it updated automatically when a feature ships.
- High-level shape: store the manuals in one place (public bucket or `public/manuals/`), a menu entry using the current UI language with a fallback to EN; long term, generate the manuals from one source (e.g. Markdown per language) so a feature change updates all 4 versions, with the update step tied to the feature logging rule.
- Notes from the codebase: the 4 PDFs are **not in the repo yet** (only `OPERATIONAL_MANUAL_v4.md`, `docs/agent/*.pdf` and the in-app `StudentHelpGuide`); the app has 10 UI languages, so decide which fallback the other 6 get.

### FF5/FF6 — Article library + automatic publishing calendar (replaces the simple weekly email)
- Goal: a system that manages its own stock of content, with an admin page to review and schedule it — not a "one article at a time" flow. (FF6 = the public "News" archive; it had not been written down before 2026-09-26 and is folded in here.)
- Structure:
  1. **Stock:** the system generates 5-10 articles in advance (same kind as the first issue — presentation/education, later news too), all in status `draft`, in `email_newsletter_drafts` or a table renamed for the new role (e.g. `article_library`).
  2. **Admin page "News / Articles"** (new Admin Dashboard section): list drafts waiting for approval; edit content before approving; approve an article and pick/confirm its publication date; see the scheduled calendar (which article goes out on which date). **Built 2026-09-26** (`/admin/newsletter`: list per campaign, per-language edit, `scheduled_for`, approve; calendar = the publication-date column of the list).
  3. **Automatic calendar:** every **Saturday** the system publishes/sends the next article that is **approved and scheduled** — the admin only chooses the order/dates, no manual trigger each week.
  4. **Automatic expiry + replacement:** any `draft` left unapproved for more than 90 days is deleted automatically and a NEW article is generated to replace it, so the stock stays at 5-10 available articles.
  5. **Language + archive:** each send uses the recipient's language (profiles.language_pref / preferred_language, EN fallback); every sent article automatically appears in a public "News" archive (FF6).
- Guardrails: generation is automatic, publishing is not — only articles an admin approved and scheduled are ever sent; a Saturday with nothing approved sends nothing.
- Notes from the codebase (2026-09-26):
  - `email_newsletter_drafts` exists (campaign, language, title, content Markdown, status `pending_approval|approved|sent|archived`, unique campaign+language, admin-only RLS) with campaign `welcome-2026-10` in 10 languages. The new flow needs at least a `draft` status (or map it to `pending_approval`), a `scheduled_for` date, and per-article grouping of the 10 language versions (the `campaign` column already does this).
  - Language: **resolved 2026-09-26** — `profiles.language_pref` now holds the user's UI language as a lowercase ISO code (saved on every change, restored at login; DB trigger + CHECK). Drafts use uppercase codes → match with `lower(language) = language_pref`, EN fallback.
  - Generation needs a server-side LLM call (an OpenAI key already exists for ai-tutor) plus a fact base so articles only describe features that exist (same rule as the first issue).
  - Email template: **must** use `supabase/functions/_shared/newsletter-email.ts` (`renderNewsletterEmail`, also used by the admin "Preview as email"), passing the per-recipient `unsubscribeUrl`.
  - Sending: cron in the existing pattern (Resend, official sender, messages_log, secret from Vault); the Saturday send time is still to decide; needs an unsubscribe/opt-out per recipient (no unsubscribe tables exist yet); de-duplicate people who are both parent and co-guardian; recipients = parent/Manager roles + co-guardians.
  - Public archive = a new public route reading only `sent` articles (RLS or a public view limited to sent rows) in the visitor's language.

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
2026-09-26 — send-newsletter-campaign — Built, deployed, tested (dry_run + test send to 2 test accounts EN/HT: 2 sent). REAL SEND NOT RUN: waits for Dany's "wi, voye kounye a"; delete the 2 +nl test accounts first; no unsubscribe link yet. See docs/ACTIVITY_LOG.md.
2026-09-26 — Newsletter email preview — Done: "Preview as email" on the admin article page renders the selected language with the shared template supabase/functions/_shared/newsletter-email.ts (the FF5 send job must use the same file). E2E 24/24 PASS, no writes/sends. Open: welcome-2026-10 found approved by admin ae29fe11 — confirm with Dany. See docs/ACTIVITY_LOG.md.
2026-09-26 — Admin News / Articles page — Done: /admin/newsletter lists one line per campaign (title in admin language + language dropdown), detail page edits title/content per language, sets scheduled_for and approves the whole article; column-limited UPDATE + trigger (server-stamped approval, only service role can mark sent). Live E2E 22/22 PASS, cleaned. See docs/ACTIVITY_LOG.md.
2026-09-26 — HT "Manager" → "Manadyè" — Done: last 6 Kreyòl strings (manager-access on /billing) now say "Manadyè"; 0 "Manager"/"Manadjè" left in HT UI. Live E2E PASS. See docs/ACTIVITY_LOG.md.
2026-09-26 — Newsletter HT rewritten + "Manadyè" — Done: HT draft of welcome-2026-10 rewritten in natural Kreyòl (approved by Dany, still pending_approval, NOT sent); UI HT "Manadjè" → "Manadyè" (2 keys). See docs/ACTIVITY_LOG.md.
