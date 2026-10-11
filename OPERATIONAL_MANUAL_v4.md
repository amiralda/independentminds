# Independent Minds EDU — Operational Manual v4.1

**Version:** 4.1  
**Date:** March 2026  
**Last updated:** 2026-10-10 — co-guardian list and pause/stop of automatic emails are live (§7, §12, §24); schedule bulk upload is live (§4), Google sign-in removed (§3); 2026-10-09 — co-guardians and automatic emails (§4, §7, §12, §24). Rule for this document: it describes only what a parent can do **in production today**; features waiting on an unmerged branch are listed separately in §24 under "Not Yet Available".  
**Author:** Dany Augustin  
**Platform URL:** https://www.independentmindsedu.org  
**Contact:** privacy@independentmindsedu.org  
**Built by:** KòdLabo

---

## Table of Contents

1. Executive Summary
2. Platform Overview and Architecture
3. User Roles and Authentication
4. Parent Dashboard
5. Student Dashboard
6. Admin Panel
7. Co-Guardian System
8. Unified Message Inbox
9. Gamification and Rewards System
10. AI Tutor — Mr A
11. Weekly Analytics and Reporting
12. Notification System
13. Hourly Monitoring System
14. Internationalization
15. Security Model
16. Data Privacy and COPPA/FERPA Compliance
17. Database Schema
18. Edge Functions Reference
19. Error Handling and Resilience
20. Testing and Quality Assurance
21. Deployment and Infrastructure
22. PWA and Mobile Experience
23. Accessibility
24. Known Limitations and Roadmap
25. Screenshots and Visual Reference

---

## 1. Executive Summary

### Platform Description

Independent Minds EDU is a multilingual (10 languages) homeschool management platform designed for Haitian families and international users. It empowers parents to organize, monitor, and celebrate their children's learning from anywhere in the world. The platform combines daily block scheduling, real-time progress tracking, AI-powered tutoring, gamification, co-guardian collaboration, and multi-channel notifications into a single progressive web application.

### v4.1 Highlights

Version 4.1 builds on the security and compliance foundation of v4.0 with major feature additions:

- **Admin Panel** — Full role-based admin dashboard with 7 sections (Overview, Students, Engagement, Rewards, System Health, Messages, Users) with real-time auto-refresh
- **Co-Guardian System** — Invite co-parents via secure token-based email links with granular permission toggles (view progress, receive SOS, approve rewards, edit lessons, full access)
- **Unified Message Inbox** — Read-once alert system at `/parent/inbox` with filter tabs, live unread badge, and edge function integration
- **10-Language i18n** — Expanded from 2 to 10 languages: EN, HT, FR, ES, PT, AR, ZH, DE, JA, RU with 150+ translation keys
- **Guardian Edge Functions** — `send-guardian-invite` and `accept-guardian-invite` for secure server-side invite processing
- **Inbox-Connected Alerts** — parent-alerts, weekly-badge, and daily-report edge functions now auto-populate the inbox alongside Telegram/WhatsApp
- **Branded Auth Emails** — Custom email templates via `auth-email-hook` with project branding

### Key Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| Lighthouse Performance | > 90 | ✅ 94 |
| Lighthouse Accessibility | > 90 | ✅ 95 |
| Security Audit Checks | 12/12 | ✅ 12/12 |
| RLS Coverage | 100% tables | ✅ 25/25 |
| Edge Functions | 14 | ✅ 14 |
| Translation Coverage | 10 languages | ✅ 10/10 |
| Offline Capability | Full | ✅ Queue + Sync |
| Notification Channels | 3 | ✅ Telegram, WhatsApp, Push |
| Admin Panel Sections | 7 | ✅ 7/7 |

### Problem Statement

Haitian homeschool families need a culturally appropriate, bilingual platform that works reliably on mobile devices with intermittent connectivity. Existing solutions are English-only, expensive, and designed for institutional schools rather than family-based education.

### Solution

Independent Minds EDU provides a free, mobile-first PWA with full Haitian Creole support, offline capabilities, AI tutoring adapted to K-12 grade levels, and parent notifications via the messaging platforms families already use (Telegram and WhatsApp).

---

## 2. Platform Overview and Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 18 + TypeScript | Component-based UI |
| Styling | Tailwind CSS + shadcn/ui | Design system |
| State Management | TanStack React Query v5 | Server state, caching |
| Routing | React Router v6 | Client-side navigation |
| Backend | Supabase (PostgreSQL 17) | Database, auth, storage |
| Edge Functions | Deno (Supabase Edge Functions) | Server-side logic |
| AI Engine | OpenAI GPT-4.1 | AI tutor (Mr A) and schedule import |
| Email | Resend | Reminders, reports, invites, newsletter, welcome email |
| Payments | Stripe (test mode) | Subscriptions, checkout, billing portal |
| Offline Storage | idb (IndexedDB) | Offline action queue |
| PDF Generation | jsPDF | Weekly report and digital check export |
| Build Tool | Vite | Development and bundling |
| PWA | vite-plugin-pwa | Service worker, installability |
| Hosting | Vercel | Web app (www.independentmindsedu.org) |

### Data Flow

```
Browser / installed PWA
    ↓ HTTPS
Vercel (web app)          Supabase Platform
                              ├── PostgreSQL 17 (RLS on every table)
                              ├── Auth (JWT sessions, optional TOTP MFA)
                              ├── pg_cron + pg_net → scheduled edge functions
                              ├── Edge Functions (Deno)
                              │   ├── ai-tutor, extract-schedule → OpenAI
                              │   ├── morning-reminder, checkin-reminder,
                              │   │   daily-report, weekly-badge → email (Resend)
                              │   ├── send-welcome-email, send-newsletter-campaign → email (Resend)
                              │   ├── hourly-monitor → admin notifications (database)
                              │   ├── dns-monitor → admin email/WhatsApp alert
                              │   └── stripe-webhook, create-checkout-session,
                              │       create-portal-session → Stripe
                              └── Storage (private bucket: student-photos)
```

### Project Structure

```
src/
├── components/         # UI components (60+)
│   ├── ui/            # shadcn/ui primitives
│   ├── admin/         # Admin panel pieces
│   ├── TutorChat.tsx  # AI tutor interface
│   ├── RewardsPanel.tsx
│   ├── OfflineIndicator.tsx
│   ├── MfaSettings.tsx
│   ├── DeleteAccountButton.tsx
│   └── ...
├── contexts/          # AuthContext
├── hooks/             # Custom React hooks
├── lib/               # Utilities (i18n, offlineQueue, syncManager, newsletter…)
├── pages/             # Route pages (Index, Login, admin/*, Privacy, Terms, etc.)
└── integrations/      # Supabase client + types

supabase/
├── functions/         # One folder per edge function (see §18)
│   └── _shared/       # newsletter-email.ts, notification-footer.ts,
│                      # haiti-time.ts, whatsapp.ts, email templates…
├── migrations/        # SQL migrations (each ends with its undo SQL)
└── config.toml
```

---

## 3. User Roles and Authentication

### Authentication Methods

| Method | Description |
|--------|-------------|
| Email + Password | Primary signup/login with email verification |
| MFA (TOTP) | Optional two-factor for parent accounts via authenticator app |

### Role Comparison

| Capability | Parent | Student |
|-----------|--------|---------|
| Create/manage students | ✅ | ❌ |
| Edit daily schedule | ✅ | ❌ |
| Mark blocks as done | ✅ | ✅ |
| Submit check-ins | ❌ | ✅ |
| Use AI tutor (Mr A) | ❌ | ✅ |
| View reports | ✅ | ❌ |
| Manage rewards catalog | ✅ | ❌ |
| Redeem rewards | ❌ | ✅ |
| Configure notifications | ✅ | ❌ |
| Enable MFA | ✅ | ❌ |
| Delete account | ✅ | ❌ |

### Onboarding Flow (v4.0)

Parents experience a 5-step guided onboarding with a progress indicator:

1. **Welcome** — Platform introduction and language selection
2. **Verify Email** — Email confirmation check
3. **Add Student** — Create the first student profile
4. **Set Up Subjects** — Configure subject tracks and daily targets
5. **Notifications** — Set up Telegram/WhatsApp (skippable)

Progress is saved to `profiles.onboarding_step` and resumes on next login if incomplete. Step 5 can be skipped with a "Set up notifications later" link, which triggers a dismissable banner on the dashboard linking to notification settings.

### Adult Confirmation (COPPA)

At parent signup, a required checkbox must be checked before the Sign Up button is enabled:

> "I confirm I am 18 years of age or older and am the parent or legal guardian of the students I will manage on this platform."

This sets `adult_confirmed: true` and `adult_confirmed_at` in the profile.

**Internal note — Google sign-in (removed from the login page 2026-10-10):** Google sign-in is not available. Every Google signup failed: `handle_new_user()` raises 'Adult confirmation required' when the signup metadata has no `adult_confirmed`, and Google never sends it (zero `google` identities in `auth.identities`). There is no post-redirect adult-confirmation screen in the app. The button is hidden (`GOOGLE_SIGN_IN_ENABLED = false` in `src/pages/Login.tsx`); the OAuth code is kept. Bringing it back needs two pieces that **must ship together**: (1) `handle_new_user` creates OAuth profiles with `adult_confirmed = false` instead of raising; (2) after the OAuth callback, the app blocks the person on an adult-confirmation screen while `adult_confirmed = false`. Piece 1 alone removes a compliance control. The Google client secret in the Supabase dashboard must also be fixed (`invalid_client` since at least 2026-10-09).

---

## 4. Parent Dashboard

### Navigation Sections

| Section | Description |
|---------|-------------|
| Today's Schedule | Daily block management with drag-and-drop |
| Student Management | Add, edit, delete students; upload photos |
| Subject Tracks | Configure subjects, categories, daily targets |
| Schedule Templates | Save, apply, clone weekly schedules |
| Weekly Reports | Analytics with PDF export |
| Rewards Management | Create/manage the rewards catalog |
| Co-Guardians | Invite co-guardians with a link, see active co-guardians and pending invites, remove access (above Students in sidebar) |
| Inbox | Unified message center with filter tabs |
| Notification Settings | Telegram, WhatsApp, channel selection |
| Activity Feed | Recent student actions |
| Certificates | Generate completion certificates |
| Learning Tools Hub | Manage educational resource links |
| Profile Settings | MFA, language, account deletion |

### Schedule Templates (v4.0)

Three template actions are available in the schedule section:

- **Save as Template** — Names and saves the current week's blocks as a reusable template
- **Apply Template** — Dropdown of parent templates + 3 built-in options:
  - Elementary Standard Week (K-5): Math, English, Science, Art, PE
  - Middle School Standard Week (6-8): Math, English, Science, Social Studies, PE, Creative
  - Flex Schedule: 4 core blocks + 1 free block per day
- **Copy Last Week** — Duplicates previous week's blocks shifted forward 7 days

### Schedule Bulk Upload (live since 2026-10-10)

Next to "Add Block" in a student's schedule, the parent has two buttons:

- **Download CSV template** — a ready-to-fill file with the expected columns.
- **Bulk Upload** — choose a file (CSV, TSV, TXT, PDF, image, or Excel `.xlsx`). A CSV whose columns are recognised is read instantly in the browser; any other file (or a CSV with unrecognised columns) is read by the AI ("read by AI").

Either way, nothing is saved until the parent checks a **preview** of every row ("Check the schedule before importing"): rows ready, rows to check (warnings), and rows with errors, which are skipped. If some dates can be read two ways (05/10 = 5 October or 10 May), the preview says so and offers a "Day comes first (DD/MM)" switch. The parent then clicks "Import N tasks".

### PDF Report Export (v4.0)

The Weekly Reports section includes a "Download Report" button that generates a branded PDF with:
- Navy (#1A365D) header with student name and week label
- Completion rate and blocks completed vs total
- Current streak and points earned
- Subject breakdown
- Footer with generation date
- Filename: `IME_Report_StudentName_WeekLabel.pdf`

### Delete My Account (v4.0)

In Profile Settings, parents can permanently delete their account by:
1. Clicking "Delete My Account"
2. Typing the word "DELETE" in the confirmation input
3. Confirming the action

This calls the `delete_my_account()` RPC which deletes the user from `auth.users`, cascading to all related data. The user is then signed out.

---

## 5. Student Dashboard

### Tabs

| Tab | Content |
|-----|---------|
| Today | Daily schedule blocks with Mark Done buttons |
| Check-In | Mood, focus, progress, and help request form |
| Mr A | AI tutor chat with per-subject history |
| Trophies | Badges and achievements gallery |
| Rewards | Points balance, shop, history, redemptions |
| Dad Panel | Quick parent-view of student stats |

### Block Lifecycle

1. **Planned** → Block appears in Today tab with subject, time, and start button
2. **In Progress** → Student taps Start, `actual_start` is recorded
3. **Done** → Student taps Mark Done, `actual_end` is recorded, points awarded
4. **Skipped** → Parent can mark a block as skipped

### Offline Mode (v4.0)

When the device loses connectivity:
- An amber banner appears at the top: "You're offline — changes will sync when you reconnect"
- Mark Done and Check-In actions are queued in IndexedDB
- React Query cache is updated optimistically
- When connectivity returns, `syncPendingActions()` processes the queue
- Failed actions retry up to 3 times before being abandoned
- A background sync event (`sync-pending-actions`) handles sync via the service worker

### Push Notifications (v4.0)

Students can opt in to browser push notifications:
- A permission prompt appears on first visit to the Today tab
- If denied, the prompt is suppressed for 7 days
- Subscriptions are stored in `push_subscriptions`
- Notifications are sent for missed blocks (via hourly monitor) and morning schedule summaries

---

## 6. Admin Panel (v4.1)

### Overview

The admin panel is a completely isolated surface accessible only to users with the `admin` role in `user_roles`. It provides read-only analytics across all families on the platform. Admin access is enforced at both the RLS layer (`has_role(auth.uid(), 'admin')`) and frontend routing.

### Navigation

The admin panel has its own dark sidebar layout with 7 sections:

| Section | Route | Description |
|---------|-------|-------------|
| Overview | `/admin` | Metric cards, weekly completions chart, pace tracker |
| Students | `/admin/students` | Full student table with velocity, streak, pace badges |
| Engagement | `/admin/engagement` | Streak leaderboards, mood charts, daily completion trends |
| Rewards | `/admin/rewards` | Points economy analytics, popular rewards, pending redemptions |
| System | `/admin/system` | Edge function status, rate limits, flagged AI inputs |
| Messages | `/admin/messages` | Delivery rates, channel breakdown, delivery logs |
| Users | `/admin/users` | Parent accounts, co-guardian overview, merge requests, role management |

### Access Control

- Admin role stored in `user_roles` table (separate from profiles)
- `has_role()` security-definer function prevents RLS recursion
- Admin link (Shield icon) visible in parent dashboard header for admin users
- "Parent Dashboard" link in admin sidebar for switching back
- All admin queries are read-only — no mutation from admin surface

### Real-Time Refresh

Admin dashboard metrics auto-refresh every 30 seconds using the `useAutoRefresh` hook, providing live data without page reloads.

---

## 7. Co-Guardian System (v4.1)

### Overview

The primary parent (account owner) can invite other adults (co-parent, grandparent…) as co-guardians. An invite is **for the whole family, not for one student**: once accepted, the co-guardian has the same access as the parent to **all** of the parent's students. Co-guardians are added via secure token-based invite links.

### Database Tables

| Table | Purpose |
|-------|---------|
| `guardian_invites` | Stores pending/accepted/revoked invite tokens with 7-day expiry |
| `co_guardians` | Active co-guardian relationships (one row per parent + co-guardian; no student column) |

### Permission Model

There is **no per-permission control today**: a co-guardian has the same read/write access as the parent on all of the family's data, through `get_managed_parent_ids()`. The table still has five legacy columns (`can_view_progress`, `can_receive_sos`, `can_approve_rewards`, `can_edit_lessons`, `is_full_access`), but no screen sets them and no RLS policy reads them (checked 2026-10-09) — do not present them to parents as permissions.

### Invite Flow

1. Primary parent enters the person's email in the Co-Guardians section and clicks "Create invite link"
2. `send-guardian-invite` validates ownership, creates (or reuses) the invite and returns a link — **no email is sent automatically**
3. The parent copies the link and sends it to the person themselves
4. The invitee opens `/accept-invite?token=...` (someone without an account first sets a password)
5. `accept-guardian-invite` validates the token and creates the co-guardian record
6. The new co-guardian receives the welcome email (once per person)

### Co-Guardian Management list (live since 2026-10-10)

The Co-Guardians section ("Co-Guardian Management") shows:

- A note at the top: a co-guardian gets access to **all** of the parent's students, not just one.
- **Active co-guardians** (with a count): one card per person with their initials, their **email as the title**, their name only when it is a real name (not just the start of the email), and "Co-guardian since <date>" (the day they accepted).
- **Pending invites** (with a count): each can have its link copied again or be cancelled.
- When there is nobody yet, an empty state explains how to invite someone.

**Remove** opens a confirmation dialog that says the person will immediately lose access to all of the parent's students; access ends as soon as the parent confirms.

### Security

- Invite tokens are 64-character hex, single-use, expire after 7 days
- Self-accept is blocked (primary parent cannot accept their own invite)
- Only the primary parent can invite or remove co-guardians; a co-guardian cannot remove themselves (DELETE policy `parent_id = auth.uid()`)
- Access covers every student of the parent (`get_managed_parent_ids()`), not a single child

### Automatic Emails (live since 2026-10-09)

Co-guardians receive **every automatic email the parent receives** — morning plan, check-in reminder, daily report, weekly badge (see §12). Proven in production by the real crons of 2026-10-09 (12:00 UTC morning reminder and 14:00 UTC check-in reminder: parent and co-guardian both received them; other families unchanged). Each send is logged in `messages_log` with `recipient_id` = the person who actually received it.

Each co-guardian (like the parent) can pause or stop these emails for themselves, from the link at the bottom of every email (see §12).

### Production Notes (internal)

- 2026-10-09: Julna DOR AUGUSTIN is a co-guardian on Dany's account, for Christian — the first co-guardian in the system.

### UI Location

Co-Guardians section is positioned **above the Students section** in the parent dashboard sidebar, making it the first management area visible when opening the menu.

---

## 8. Unified Message Inbox (v4.1)

### Overview

All alerts (SOS, lesson completions, streak milestones, reward redemptions) are stored as messages in the `inbox_messages` table. Parents access them via the Inbox tab in the sidebar.

### Message Types

| Type | Source | Icon Color |
|------|--------|-----------|
| `sos` | parent-alerts edge function | Red |
| `lesson_completed` | parent-alerts, daily-report | Teal |
| `streak_milestone` | weekly-badge | Purple |
| `reward_redeemed` | reward processing | Amber |
| `inactivity_alert` | monitoring | Gray |

### Features

- **Filter Tabs**: All, Unread, SOS, Lessons, Rewards, Streaks
- **Read-Once Dashboard Banners**: SOS banners clear after reading in inbox
- **Unread Badge**: Red count badge on Inbox nav link, updates in real-time
- **Mark All Read**: Bulk mark-as-read button
- **Co-Guardian Access**: Co-guardians with `can_receive_sos` see SOS messages only

### Edge Function Integration

The following edge functions insert into `inbox_messages` alongside their existing notification channels:
- `parent-alerts` — maps `help_needed` → SOS, `track_completed` → lesson_completed, `badge_earned` → streak_milestone
- `weekly-badge` — inserts streak_milestone messages with badge details
- `daily-report` — inserts lesson_completed summary messages

---

## 9. Gamification and Rewards System

### Points Economy

| Action | Points |
|--------|--------|
| Complete a block | +10 |
| Submit a check-in | +15 |
| Perfect day (all blocks done) | +25 |
| Weekly streak bonus | +50 |

### Badges

Badges are automatically awarded by the `weekly-badge` edge function and stored in the `achievements` table. Types include:
- Streak badges (3-day, 7-day, 30-day)
- Subject mastery badges
- Perfect week badges
- Milestone badges (100 blocks, etc.)

### Rewards Shop

Parents create rewards in the catalog with names, icons, descriptions, and point costs. Students browse and redeem rewards, which enter a "pending" state for parent fulfillment.

### Rewards Discovery (v4.0)

When the rewards catalog is empty, students see an inspiration gallery with 8 suggested rewards:

| Reward | Points |
|--------|--------|
| 🎬 Movie Night | 200 |
| 📱 Extra Screen Time | 100 |
| 🍦 Ice Cream Trip | 150 |
| 🌙 Stay Up Late | 80 |
| 🍽️ Choose Dinner | 120 |
| 🎮 Extra Game Time | 175 |
| 🏖️ Day Trip | 300 |
| 📚 New Book | 130 |

Tapping a card sends a `reward_suggestion` notification to the parent via Telegram/WhatsApp, suggesting they add it to the catalog. The card shows a "Sent" state after tapping.

---

## 10. AI Tutor — Mr A

### Overview

Mr A is an AI study buddy powered by Google Gemini 2.5 Flash. Students interact with Mr A through a chat interface filtered by subject. Mr A provides step-by-step explanations adapted to the student's grade level in their preferred language.

### Conversation History (v4.0)

- Conversations are persisted per-student per-subject in the `ai_conversations` table
- The last 20 messages are loaded as context for each API call
- History survives page reloads and session changes
- A "Clear History" button allows students to reset a subject's conversation
- Messages older than 90 days are auto-pruned
- Maximum 100 messages per student per subject

### Rate Limiting (v4.0)

- **Limit:** 30 requests per student per hour
- When exceeded, a non-dismissable info banner appears in the chat area (not a toast)
- The banner shows when the limit resets
- HTTP 429 response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` headers

### Prompt Injection Hardening (v4.0)

The system prompt enforces strict rules:
1. Mr A never pretends to be another AI or system
2. Only K-12 educational topics are discussed
3. System prompt and configuration are never revealed
4. Responses match the student's language preference
5. Distressed students are encouraged to talk to a trusted adult
6. Students are guided to answers rather than given direct solutions

Input sanitization:
- Injection patterns (e.g., "ignore previous instructions") are replaced with `[removed]`
- Input is hard-capped at 2,000 characters
- Flagged inputs are logged to `flagged_inputs` (student_id, reason, length only — never the content)

---

## 11. Weekly Analytics and Reporting

### Dashboard Analytics

The parent dashboard displays:
- Weekly completion rate (blocks done / total)
- Subject-by-subject breakdown
- Streak counter
- Points earned this week
- Mood trend from check-ins

### PDF Export (v4.0)

A "Download Report" button generates a professional PDF using jsPDF with:
- Branded Navy header
- Student name and week date range
- Completion statistics
- Subject breakdown table
- Streak and points summary
- Generation timestamp footer

---

## 12. Notification System

### Current State (2026-10-09)

What parents and co-guardians actually receive today are **four automatic emails**, sent from `Independent Minds EDU <noreply@independentmindsedu.org>`, bilingual EN/HT, to families with an active or trialing subscription:

| Email | Cron (UTC) | Haiti time, summer (UTC−4) | Haiti time, winter (UTC−5) | Condition |
|-------|------------|----------------------------|----------------------------|-----------|
| Morning plan | `0 12 * * *` — daily 12:00 UTC | 8:00 am | 7:00 am | Today's tasks for each student |
| Check-in reminder | `0 14 * * *` — daily 14:00 UTC | 10:00 am | 9:00 am | Only if the student has not checked in yet |
| Daily report | `0 1 * * *` — daily 01:00 UTC | 9:00 pm (the day before, in Haiti) | 8:00 pm (the day before, in Haiti) | Tasks done / not done, check-ins, help requests |
| Weekly badge | `0 2 * * 1` — Monday 02:00 UTC | Sunday 10:00 pm | Sunday 9:00 pm | Only if the student made progress that week |

Haiti summer time (UTC−4) runs from the 2nd Sunday of March to the 1st Sunday of November (2026: March 8 → November 1); winter time (UTC−5) the rest of the year. Times checked with Postgres `at time zone 'America/Port-au-Prince'` on 2026-10-09.

**Internal note:** the crons are fixed in UTC, so the local time in Haiti changes with each season (one hour later in summer). Keeping a fixed local time would require changing the crons — a decision Dany has not taken yet.

Each email goes to the parent **and every co-guardian** (see §7).

### Pause or Stop Automatic Emails (live since 2026-10-10)

Every one of these four emails ends with a short footer, in the person's own language: why they receive it ("as the parent of …" / "as a co-guardian for …"), a link **"Pause or stop this type of email"** and a link **"Manage all emails"**. Both open the page `/notifications` (no login needed — the link is personal). On that page each person can, for each type of email (morning plan, check-in reminder, daily report, weekly badge) or for all of them at once:

- **Pause** it for 1 week, 2 weeks or 1 month — the page shows "Paused — resumes <date>";
- **Stop** it;
- **Turn it back on**.

Each person only controls their own emails: a parent cannot silence a co-guardian's, and a co-guardian cannot silence the parent's. Mail apps that support one-click unsubscribe (Gmail, Outlook, Apple Mail) also show their own "Unsubscribe" button, which stops that type of email only. Emails about the account itself (password reset, etc.) are not affected.

**Internal notes:** preferences live in `notification_preferences` (no row = on; 'all' is a master switch; a pause's date is the first day mail resumes, on the Haiti calendar). The four senders ask `notify_recipients_for_parent(parent, category)`, which leaves out anyone who paused or stopped that category. Since 2026-10-10 the daily report and check-in reminder count check-ins over the Haiti calendar day (00:00–24:00 Haiti time), and the weekly badge over the Haiti Monday-to-Sunday week — before, the window started at midnight UTC (20:00 / 19:00 Haiti the day before).

The multi-channel design below is the earlier v4.0 plan, not today's behavior: WhatsApp dispatch is not implemented, no parent has Telegram configured, and the `weekly-report` and `parent-alerts` functions are in the repo but not deployed.

### Multi-Channel Architecture (v4.0)

Notifications are delivered via Telegram, WhatsApp, or both, based on the parent's `notification_channel` setting.

| Channel | Provider | Configuration |
|---------|----------|---------------|
| Telegram | Telegram Bot API | Bot token + chat ID per parent |
| WhatsApp | Twilio Messages API | E.164 phone number per parent |
| Web Push | Web Push API (VAPID) | Browser subscription per student |

### Notification Types

| Type | Trigger | Channels |
|------|---------|----------|
| Badge Earned | Student earns a new badge | Telegram, WhatsApp |
| Help Needed | Student requests help in check-in | Telegram, WhatsApp |
| Weekly Summary | Manual trigger from dashboard | Telegram, WhatsApp |
| Track Completed | Student completes daily target | Telegram, WhatsApp |
| Test Connection | Parent tests notification setup | Telegram, WhatsApp |
| Reward Suggestion | Student suggests a reward | Telegram, WhatsApp |
| Morning Schedule | Daily at configured time | Telegram, WhatsApp, Push |
| Check-in Reminder | Midday if no check-in submitted | Telegram, WhatsApp |
| Daily Report | End of day summary | Telegram, WhatsApp |
| Weekly Report | End of week summary | Telegram, WhatsApp |
| Missed Block Alert | Hourly if blocks are behind | Telegram, WhatsApp, Push |

### Notification Settings UI

The settings panel (renamed from "Telegram Settings" to "Notification Settings") includes:
- Telegram bot token and chat ID inputs
- WhatsApp number input with E.164 validation (`/^\+[1-9]\d{7,14}$/`)
- Channel selector: Telegram only / WhatsApp only / Both
- Test buttons for each channel
- WhatsApp enable/disable toggle

### Shared Notification Utility

The `notifyParent()` function in `_shared/notify.ts`:
- Accepts parent settings and message
- Routes to Telegram, WhatsApp, or both based on `notification_channel`
- Catches errors per channel independently
- Logs all attempts to `messages_log`

---

## 13. Hourly Monitoring System

### How It Works

The `hourly-monitor` edge function runs every hour via cron:

1. Queries all students with `monitoring_enabled = true`
2. Checks if the current time falls within any scheduled block
3. Identifies blocks that should have started but haven't
4. Sends a parent alert via the configured notification channel
5. (v4.0) Also sends a Web Push notification to the student's subscribed browsers

### Alert Format

```
⏰ Block Alert for [Student Name]
📚 Subject: [Subject]
🕐 Scheduled: [Start Time] - [End Time]
⚠️ Status: Not started

Please check on your student.
— Independent Minds EDU
```

---

## 14. Internationalization

### Supported Languages (v4.1)

| Code | Language | Flag | Coverage |
|------|----------|------|----------|
| EN | English | 🇺🇸 | 100% |
| HT | Haitian Creole (Kreyòl) | 🇭🇹 | 100% |
| FR | Français | 🇫🇷 | 100% |
| ES | Español | 🇪🇸 | 100% |
| PT | Português | 🇧🇷 | 100% |
| AR | العربية | 🇸🇦 | 100% |
| ZH | 中文 | 🇨🇳 | 100% |
| DE | Deutsch | 🇩🇪 | 100% |
| JA | 日本語 | 🇯🇵 | 100% |
| RU | Русский | 🇷🇺 | 100% |

### Implementation

The `useI18n()` hook from `src/lib/i18n.tsx` provides:
- `lang` — current language code
- `t(key)` — translation lookup with nested key support
- `setLang(code)` — language switcher

Language preference is stored in `profiles.language_pref` and `students.language_pref`.

The language selector is a dropdown (replacing the previous 🇺🇸/🇭🇹 toggle) showing all 10 languages with their flags and native labels, available from every view.

### Translation Keys (150+)

All features include translations across all 10 languages:
- Core navigation and UI labels
- Co-guardian system (invite, permissions, management)
- Message inbox (filters, status labels, actions)
- Signup, privacy, terms, deletion
- Offline indicators, sync messages
- Onboarding steps, reward suggestions
- AI tutor, rate limit messages
- MFA, notification settings
- Accessibility labels

---

## 15. Security Model

### Row-Level Security (RLS)

Every table in the `public` schema (55 in production) has RLS enabled. In the table below, **Family** means the parent account and the people who work for that family: its Managers and its Co-Guardians (database function `get_managed_parent_ids`). **Student** means the student account, for its own rows only. **None** means no browser client can do it; only server functions (service role) can.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Own (+ admin) | Own | Own | Own |
| students | Family, student (own row), admin | Family | Family; student (own photo only, enforced by trigger) | Family |
| daily_plan | Family, student | Family | Family; student (status only, enforced by trigger) | Family |
| check_ins | Family, student, admin | Family, student | Family | Family |
| achievements | Family, student | None | None | None |
| subject_tracks | Family, student | Family | Family | Family |
| reward_points | Family, student, admin | None (server functions) | None | None |
| reward_redemptions | Family, student, admin | Family (students go through `redeem_reward`) | Family | Family |
| rewards_catalog | Family, student (own family) | Family | Family | Family |
| ai_conversations | Family, student | Family, student | Family, student | Family |
| messages_log | Admin only | None | None | None |
| parent_settings | Own | Own | Own | Own |
| rate_limits | Admin only | None (`increment_rate_limit`) | None | None |
| flagged_inputs | Admin only | None | None | None |
| schedule_templates | Family | Family | Family | Family |
| activity_logs | Family, student, admin | Family | Family | Family |
| co_guardians | Primary parent, the co-guardian (own row) | None (edge function) | None | Primary parent |
| guardian_invites | Primary parent | None (edge function) | Primary parent (revoke a pending invite only) | None |
| inbox_messages | Family | Family | Family | Family |
| user_roles | Own role, admin | Admin | Admin | Admin |
| learning_tools | Family | Family | Family | Family |

### Rate Limiting

| Function | Limit | Window |
|----------|-------|--------|
| ai-tutor | 30 requests | Per signed-in user per clock hour |

Implemented via the `increment_rate_limit()` SECURITY DEFINER RPC. The `rate_limits` table has no client write policy — only the RPC can write to it.

### Prompt Injection Defense

- Hardened system prompt with explicit refusal instructions
- `sanitizeInput()` function strips injection patterns
- Input length capped at 2,000 characters
- Flagged inputs logged without storing content (`flagged_inputs`: student, reason, length)

### MFA

- Optional TOTP-based MFA for parent accounts
- Enrollment via QR code scanning
- 6-digit verification code
- "Account Protected" badge when active
- Disable requires password re-entry

### Other Controls

- Storage: the only bucket, `student-photos`, is private.
- Admin functions called from the browser (e.g. `admin_set_subscription`) check `has_role(auth.uid(), 'admin')` inside and refuse others with error 42501; anonymous visitors cannot call them.
- Scheduled functions require the `x-cron-secret` header (value kept in Supabase Vault).
- Paid features (AI tutor, weekly reports) are checked on the server against the family's subscription.

---

## 16. Data Privacy and COPPA/FERPA Compliance

### Privacy Policy

A full Privacy Policy is live at `/privacy`, accessible without authentication, rendered in both EN and HT. It covers:
- Information collected (parent data, student data, device data)
- How data is used (platform operation, notifications, AI tutoring)
- No selling, sharing, or monetizing personal data
- No advertising
- COPPA compliance (parental consent, no child self-registration)
- Data sharing limited to Google (Gemini AI, session-only), Supabase, Telegram, Twilio
- Data retention (18-month re-engagement, 24-month warning, 30-day deletion window)
- Security measures (RLS, HTTPS, JWT)
- Parent rights (access, correction, deletion, portability)

### Terms of Service

Full Terms of Service are live at `/terms`, accessible without authentication. Key sections:
- Must be 18+ to register
- Educational use only — not for institutional school records
- FERPA disclaimer for institutional users
- AI tutor disclaimer (not a substitute for qualified educators)
- Intellectual property owned by Dany Augustin

### COPPA Compliance

1. **Adult confirmation at signup** — Required checkbox before registration
2. **No child self-registration** — Students are created only by verified parents
3. **Parental data control** — Parents can view, edit, and delete all student data
4. **Minimal data collection** — Only what's needed for educational services
5. **No third-party analytics or advertising**

### FERPA Disclaimer

"Independent Minds EDU is designed for private family use. It is not a school records system under FERPA. If you represent an institution receiving federal funding, contact legal@independentmindsedu.org before use."

### Data Retention Automation (v4.0)

The `account-maintenance` edge function runs monthly (1st of each month, 02:00 Haiti time):
- 18 months inactive → re-engagement email
- 24 months inactive → deletion warning email with 30-day window
- 30 days after warning with no activity → hard delete

### AI Conversation Data

AI conversations are persisted for active tutoring continuity but:
- Auto-pruned after 90 days
- Capped at 100 messages per student per subject
- Students can clear history at any time
- Flagged inputs store metadata only, never content

---

## 17. Database Schema

### Tables (55 in production, RLS on all)

| Table | Purpose |
|-------|---------|
| profiles | User profiles and settings (incl. language) |
| students | Student records |
| daily_plan | Daily schedule blocks |
| check_ins | Student mood/progress check-ins |
| achievements | Badges and awards |
| subject_tracks | Subject configuration |
| activity_logs | Track-level activity records |
| reward_points | Points ledger |
| reward_redemptions | Reward claim records |
| rewards_catalog | Available rewards |
| learning_tools | Educational resource links |
| ai_conversations | AI tutor chat history |
| schedule_templates | Reusable schedule templates |
| rate_limits | API rate limit counters |
| flagged_inputs | Suspicious AI input metadata |
| user_roles | Roles (parent, student, manager, admin…) |
| co_guardians | Co-guardian relationships |
| guardian_invites | Invite tokens for co-guardians |
| student_account_invites | Student login invitations |
| manager_requests, manager_parents | Manager applications and the families each Manager works for |
| inbox_messages | Parent message inbox |
| parent_settings | Notification configuration |
| messages_log | Email delivery log |
| notification_preferences, notification_pref_tokens | Pause/stop per email category, footer link tokens |
| suppressed_emails, email_unsubscribe_tokens | Newsletter unsubscribes and their single-use tokens |
| email_newsletter_drafts, newsletter_sends | Newsletter articles (10 languages) and per-person send log |
| welcome_emails, welcome_email_sends | Welcome email text (10 languages) and once-per-person send log |
| subscriptions | Plan and status per family (Stripe or set by an admin) |
| subscription_admin_changes | Who changed a subscription, when, before → after |
| stripe_customers, billing_events | Stripe customer link and webhook/billing event log |
| password_reset_requests | "Forgot password" requests |
| auth_failures | Failed sign-in tracking |
| platform_errors | Client error reports (track-error) |
| admin_notifications | Admin alerts (bell in the admin panel) |
| impersonation_logs | Admin "view as" log |
| dns_monitor_state, dns_monitor_history | Domain monitoring |
| user_feedback | In-app feedback widget |
| beta_config, beta_events, beta_feedback, beta_invite_logs, beta_invites, beta_requests, beta_sessions, beta_task_completions, beta_tasks, beta_testers | Beta program |

### Key Database Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Trigger: creates profile on signup with adult_confirmed fields |
| `get_my_student_id()` | Returns calling user's student_id |
| `get_managed_parent_ids(uid)` | The family ids a user may act for (own, as Manager, as Co-Guardian) — used by RLS |
| `award_points(...)` | SECURITY DEFINER: awards points safely |
| `redeem_reward(...)` | SECURITY DEFINER: redeems rewards with balance check |
| `increment_rate_limit(...)` | SECURITY DEFINER: atomic rate limit counter |
| `update_updated_at_column()` | Trigger: auto-updates updated_at |
| `has_role(_user_id, _role)` | SECURITY DEFINER: checks a role (e.g. admin) |
| `get_my_effective_subscription()` | The subscription that applies to the caller (own, or the family's) |
| `admin_set_subscription(...)`, `admin_list_parent_subscriptions()` | Admin: set plan/status/end date, list every parent (logged in subscription_admin_changes) |
| `trg_trial_on_email_confirmed()` | Trigger: 14-day Basic trial when a new parent confirms their email |
| `expire_manual_subscriptions()` | Expires trials/manual subscriptions past their end date (cron created disabled) |
| `enqueue_welcome_email(...)` | Queues the welcome email (never blocks signup) |
| `is_notification_enabled(...)` | Checks a person's pause/stop choice before an email is sent |

---

## 18. Edge Functions Reference

### Function Inventory (deployed in production)

| Function | Trigger | Auth | Description |
|----------|---------|------|-------------|
| ai-tutor | HTTP POST | JWT | Mr A tutoring via OpenAI GPT-4.1 (30 requests/hour/user, paid plans) |
| extract-schedule | HTTP POST | JWT | Reads an uploaded schedule for the schedule import |
| weekly-report-data | HTTP POST | JWT | Data for the weekly progress report (paid plans) |
| morning-reminder | Cron 12:00 UTC daily | Cron secret | Morning schedule email |
| checkin-reminder | Cron 14:00 UTC daily | Cron secret | Check-in reminder email |
| daily-report | Cron 01:00 UTC daily | Cron secret | End-of-day summary email |
| weekly-badge | Cron Monday 02:00 UTC | Cron secret | Weekly badge email |
| hourly-monitor | Cron hourly (:05) | Cron secret | Admin alert rules → admin notifications |
| dns-monitor | Cron every 15 min | Cron secret | Domain checks, alerts the admin |
| send-newsletter-campaign | Admin (manual) + cron Saturday 19:00 UTC | Admin JWT / cron secret | Newsletter send (the deployed version, with the cron, comes from the unmerged branch feat/newsletter-cron; main has the manual-only version) |
| send-welcome-email | Database trigger (pg_net) | Cron secret | Welcome email, once per person |
| unsubscribe | Public link | Token | Newsletter unsubscribe (+ one-click) |
| notification-preferences | Public link | Token | Pause/stop an email category |
| create-checkout-session | HTTP POST | JWT | Stripe checkout |
| create-portal-session | HTTP POST | JWT | Stripe billing portal |
| stripe-webhook | Stripe webhook | Stripe signature | Keeps subscriptions in sync |
| send-guardian-invite | HTTP POST | JWT | Creates a co-guardian invite |
| accept-guardian-invite | HTTP POST | JWT | Accepts a co-guardian invite |
| create-student-account | HTTP POST | JWT | Creates a student login |
| reset-student-password | HTTP POST | JWT | New "set your password" link for a student |
| request-password-reset | HTTP POST | Public | "Forgot password?" |
| manager-create-parent | HTTP POST | JWT | Manager creates a family account |
| review-manager-request | HTTP POST | JWT | Admin approves/declines a Manager request |
| track-error | HTTP POST | JWT | Client error reports |
| track-auth-failure | HTTP POST | Public | Failed sign-in tracking |
| beta-track | HTTP POST | Public | Beta program tracking |

Also deployed, with no source folder in the repository (older names): `test-faz1-fixture`, `monitor-create-parent`, `review-monitor-request`.

Folders in `supabase/functions/` that are **not** deployed (not running in production): parent-alerts, weekly-report, telegram-link, auth-email-hook, process-email-queue, send-transactional-email, weekly-backup, admin-notify, account-merge and others.

### Environment Secrets (read by the deployed functions)

| Secret | Used By | Frontend? |
|--------|---------|-----------|
| SUPABASE_URL | All | Via VITE_ prefix |
| SUPABASE_SERVICE_ROLE_KEY | Most functions | ❌ Never |
| SUPABASE_ANON_KEY / SUPABASE_PUBLISHABLE_KEY | JWT functions, send-newsletter-campaign | Via VITE_ prefix |
| AI_GATEWAY_URL, AI_GATEWAY_API_KEY | ai-tutor, extract-schedule (OpenAI) | ❌ Never |
| RESEND_API_KEY | Email-sending functions | ❌ Never |
| CRON_SECRET | Scheduled functions, send-welcome-email | ❌ Never |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | Stripe functions | ❌ Never |
| TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, ADMIN_WHATSAPP_NUMBER | dns-monitor (admin alert only) | ❌ Never |
| BETA_ADMIN_EMAIL, MONITOR_DOMAIN, MONITOR_CANONICAL_DOMAIN | dns-monitor | ❌ Never |

---

## 19. Error Handling and Resilience

### Error Strategy

| Context | Approach |
|---------|----------|
| Edge functions | Generic error messages to clients; detailed logs server-side |
| Supabase queries | React Query error/retry with toast notifications |
| AI tutor | Graceful degradation with user-friendly messages |
| Rate limits | HTTP 429 with reset time; UI banner (not toast) |
| Network failures | Offline queue with retry (max 3 attempts) |
| Auth failures | Redirect to login with session cleanup |

### Offline Queue (v4.0)

The offline queue in `src/lib/offlineQueue.ts` provides:
- `queueAction(type, payload)` — stores action in IndexedDB
- `getPendingActions()` — retrieves all queued actions
- `removeAction(id)` — removes a successfully synced action
- `incrementRetry(id)` — increments retry counter

The sync manager in `src/lib/syncManager.ts`:
- Processes `COMPLETE_BLOCK` and `SUBMIT_CHECKIN` action types
- Removes successful actions from the queue
- Increments retry count on failure
- Abandons actions after 3 retries
- Triggered by coming online or background sync event

---

## 20. Testing and Quality Assurance

### Testing Stack

| Tool | Purpose |
|------|---------|
| Vitest | Unit and integration tests |
| Testing Library | Component testing |
| jsdom | DOM simulation |

### Security Testing

The 12-point security audit (Section 15) covers:
1. RLS completeness on all 19 tables
2. Storage bucket privacy
3. Edge function authentication
4. Privilege escalation prevention
5. Profile field immutability
6. Telegram token encryption
7. Cross-user data isolation
8. messages_log write protection
9. Input sanitisation
10. Rate limit enforcement
11. New tables audit
12. Secret isolation

All 12 checks pass as of v4.0.

---

## 21. Deployment and Infrastructure

### Deployment Pipeline

1. Code pushed to GitHub main branch
2. Hosting provider (for example Vercel) builds and deploys the frontend
3. Edge functions deploy automatically on push
4. Database migrations run via Supabase migration tooling

### Infrastructure

| Component | Provider |
|-----------|----------|
| Frontend hosting | Vercel |
| Database | Supabase (PostgreSQL 15) |
| Edge Functions | Supabase Edge Functions (Deno) |
| File Storage | Supabase Storage |
| Domain | independentmindsedu.org |
| SSL | Automatic via hosting provider |

---

## 22. PWA and Mobile Experience

### PWA Features

| Feature | Status |
|---------|--------|
| Installable | ✅ Add to Home Screen |
| Service Worker | ✅ Caching + background sync |
| Offline Support | ✅ IndexedDB queue + sync |
| Push Notifications | ✅ VAPID-based Web Push |
| Responsive | ✅ Mobile-first design |

### Offline Capabilities (v4.0)

- Block completions queued locally when offline
- Check-in submissions queued locally when offline
- Visual offline indicator banner
- Automatic sync on reconnection
- Background sync via service worker

### Web Push (v4.0)

- VAPID authentication for secure push
- Per-student subscription management
- Notifications for missed blocks and morning schedules
- Graceful handling of expired/revoked subscriptions

---

## 23. Accessibility

### WCAG 2.1 AA Compliance (v4.0)

| Requirement | Implementation |
|-------------|----------------|
| Skip to content | First focusable element, visible on focus |
| ARIA live regions | Toast container, stats bar |
| Progress bars | `role="progressbar"` with aria-valuenow/min/max |
| Image alt text | Student photos use student name |
| Icon buttons | `aria-label` on all icon-only buttons |
| Form labels | All inputs have associated labels |
| Focus management | Modals trap and restore focus |
| Color contrast | #475569 on #F0F4F8 (passes AA) |

### Multilingual Accessibility

All accessibility labels are available in all 10 supported languages:
- Skip to content: localized via i18n
- Stats bar: role="status" with aria-live
- Student photos: "Photo of [name]" localized per language
- RTL support for Arabic (AR) language

---

## 24. Known Limitations and Roadmap

### Completed in v4.0

- ✅ Offline data sync with IndexedDB
- ✅ AI conversation history persistence
- ✅ WCAG 2.1 AA accessibility improvements
- ✅ Multi-channel notifications (WhatsApp)
- ✅ Schedule templates
- ✅ Rate limiting on edge functions
- ✅ MFA for parent accounts
- ✅ Privacy Policy and Terms of Service
- ✅ Adult confirmation at signup
- ✅ Data retention automation
- ✅ PDF report export
- ✅ Rewards discovery system
- ✅ Prompt injection hardening

### Completed in v4.1

- ✅ Admin panel with 7 sections and real-time refresh
- ✅ Co-guardian system with invite flow and permission toggles
- ✅ Unified message inbox with filter tabs and live unread badge
- ✅ Extended i18n to 10 languages (150+ keys)
- ✅ Guardian edge functions (send-invite, accept-invite)
- ✅ Inbox-connected alerts (parent-alerts, weekly-badge, daily-report)
- ✅ Branded auth email templates
- ✅ Copy-to-clipboard for invite links
- ✅ Co-Guardians repositioned above Students in sidebar

### Current Limitations

- No native mobile app (PWA only)
- No real-time collaborative editing of schedules
- AI tutor limited to text (no image/voice input)
- No automated curriculum alignment verification
- Push notifications require browser support (not available on older iOS)
- WhatsApp requires Twilio account with approved templates for some regions

### Not Yet Available — Awaiting Merge

Nothing is waiting on a branch as of 2026-10-10: the CSV import, the co-guardian list and the pause/stop of automatic emails are all live (see §4, §7, §12). New features built on a branch are listed here until they are merged.

### Future Roadmap

- Voice input for AI tutor
- Curriculum marketplace for sharing lesson plans
- Multi-student household analytics dashboard
- Native mobile app (React Native)
- Parent-teacher communication features
- Automated progress reports to education authorities
- Integration with Time4Learning API
- Student-to-student study groups

---

## 25. Screenshots and Visual Reference

Screenshots reflect v4.1 of the platform. Key visual features include:

- Parent dashboard with Co-Guardians above Students in sidebar
- Admin panel with dark sidebar and 7 metric sections
- 10-language dropdown selector (replacing previous flag toggle)
- Unified Inbox with filter tabs and unread badges
- Co-Guardian permission toggles with copy-to-clipboard invite links
- Onboarding progress indicator with gold progress bar
- MFA settings panel with QR code display
- Offline indicator amber banner
- Rewards inspiration gallery (8 suggested cards)
- Notification Settings panel with WhatsApp and channel selector
- AI tutor rate limit banner
- Delete Account confirmation dialog
- Schedule template management buttons
- PDF report download button

For the most current visual reference, visit the live application at https://www.independentmindsedu.org.

---

*Independent Minds EDU v4.1 — Built with Love by KòdLabo*  
*© 2026 Independent Minds EDU. All rights reserved.*
