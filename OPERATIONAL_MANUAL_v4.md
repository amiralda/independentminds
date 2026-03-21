# Independent Minds EDU — Operational Manual v4.1

**Version:** 4.1  
**Date:** March 2026  
**Author:** Dany Augustin  
**Platform URL:** https://independentmindsedu.com  
**Contact:** privacy@independentmindsedu.com  
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
| Backend | Lovable Cloud (Supabase/PostgreSQL 15) | Database, auth, storage |
| Edge Functions | Deno (Supabase Edge Functions) | Server-side logic |
| AI Engine | Google Gemini 2.5 Flash | AI tutor responses |
| Notifications | Telegram Bot API + Twilio WhatsApp | Parent alerts |
| Push Notifications | Web Push API + VAPID | Student browser alerts |
| Offline Storage | idb (IndexedDB) | Offline action queue |
| PDF Generation | jsPDF | Weekly report export |
| Build Tool | Vite 5 | Development and bundling |
| PWA | vite-plugin-pwa | Service worker, installability |
| Encryption | Web Crypto API (AES-256-GCM) | Token encryption |

### Data Flow

```
Student Device (PWA)
    ↓ HTTPS
Lovable Cloud (Supabase)
    ├── PostgreSQL 15 (RLS-protected)
    ├── Auth (JWT sessions)
    ├── Edge Functions (Deno)
    │   ├── ai-tutor → Gemini AI
    │   ├── parent-alerts → Telegram / WhatsApp
    │   ├── hourly-monitor → Push + Telegram
    │   ├── morning-reminder → Push + Telegram
    │   ├── checkin-reminder → Telegram
    │   ├── daily-report → Telegram
    │   ├── weekly-report → Telegram
    │   ├── weekly-badge → Database
    │   └── account-maintenance → Email + Cleanup
    └── Storage (student photos, email assets)
```

### Project Structure

```
src/
├── components/         # UI components (40+)
│   ├── ui/            # shadcn/ui primitives
│   ├── TutorChat.tsx  # AI tutor interface
│   ├── RewardsPanel.tsx
│   ├── OfflineIndicator.tsx
│   ├── MfaSettings.tsx
│   ├── DeleteAccountButton.tsx
│   ├── PushPermissionPrompt.tsx (planned)
│   └── ...
├── contexts/          # AuthContext
├── hooks/             # Custom React hooks
├── lib/               # Utilities (i18n, offlineQueue, syncManager)
├── pages/             # Route pages (Index, Login, Privacy, Terms, etc.)
└── integrations/      # Supabase client + types

supabase/
├── functions/
│   ├── ai-tutor/
│   ├── parent-alerts/
│   ├── hourly-monitor/
│   ├── morning-reminder/
│   ├── checkin-reminder/
│   ├── daily-report/
│   ├── weekly-report/
│   ├── weekly-badge/
│   ├── account-maintenance/
│   ├── auth-email-hook/
│   └── _shared/
│       ├── crypto.ts
│       ├── notify.ts
│       ├── whatsapp.ts
│       └── email-templates/
└── config.toml
```

---

## 3. User Roles and Authentication

### Authentication Methods

| Method | Description |
|--------|-------------|
| Email + Password | Primary signup/login with email verification |
| Google OAuth | Social login with post-redirect adult confirmation |
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

This sets `adult_confirmed: true` and `adult_confirmed_at` in the profile. Google OAuth users see a post-redirect modal if `adult_confirmed` is false.

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
| Co-Guardians | Invite co-parents, manage permissions (above Students in sidebar) |
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

The primary parent (account owner) can invite additional co-guardians per student. Each co-guardian has a granular permission set controlled with individual on/off toggles. Co-guardians are added via secure token-based invite links.

### Database Tables

| Table | Purpose |
|-------|---------|
| `guardian_invites` | Stores pending/accepted/revoked invite tokens with 7-day expiry |
| `co_guardians` | Active co-guardian relationships with 5 permission toggles |

### Permission Model

| Permission | Default | Description |
|-----------|---------|-------------|
| `can_view_progress` | ✅ ON | View student progress (always on, minimum permission) |
| `can_receive_sos` | ❌ OFF | Receive SOS alerts |
| `can_approve_rewards` | ❌ OFF | Approve & deny reward redemptions |
| `can_edit_lessons` | ❌ OFF | Add & edit lessons |
| `is_full_access` | ❌ OFF | Enables all permissions; disabling reverts to individual states |

### Invite Flow

1. Primary parent enters email in the Co-Guardians section (above Students in sidebar)
2. `send-guardian-invite` edge function validates ownership, creates invite, sends branded email
3. Invitee receives email with accept link (`/accept-invite?token=...`)
4. If not logged in, invitee is redirected to login/signup first
5. `accept-guardian-invite` edge function validates token, creates co-guardian record
6. Primary parent is notified via inbox
7. Primary parent manages permissions via toggle switches

### Security

- Invite tokens are 64-character hex, single-use, expire after 7 days
- Self-accept is blocked (primary parent cannot accept their own invite)
- Permissions enforced at DB layer via `has_guardian_permission()` security-definer
- Co-guardians cannot elevate their own permissions
- RLS policies ensure co-guardians only see students they co-manage

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

## 7. AI Tutor — Mr A

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

## 8. Weekly Analytics and Reporting

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

## 9. Notification System

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

## 10. Hourly Monitoring System

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

## 12. Security Model

### Row-Level Security (RLS)

Every table in the database has RLS enabled. All 19 tables have appropriate policies:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Own only | Own + parent role | Own (role/student_id locked) | Blocked |
| students | Parent or self | Parent only | Parent only | Parent only |
| daily_plan | Own student | Own student | Own student | Parent only |
| check_ins | Own student | Own student | Own student | Own student |
| achievements | Own student | Parent only | Parent only | Parent only |
| subject_tracks | Own student | Parent only | Parent only | Parent only |
| reward_points | Own student | Parent only (via RPC) | Blocked | Blocked |
| reward_redemptions | Own student | Own (pending only) | Parent only | Blocked |
| rewards_catalog | Own student | Parent only | Parent only | Parent only |
| ai_conversations | Own student + parent | Student only | Blocked | Blocked |
| messages_log | Own only | Blocked | Blocked | Blocked |
| parent_settings | Own only | Own only | Own only | Own only |
| rate_limits | Own only | Blocked | Blocked | Blocked |
| flagged_inputs | Blocked | Blocked | Blocked | Blocked |
| push_subscriptions | Own student | Own student | Own student | Own student |
| schedule_templates | Own or builtin | Own only | Own only | Own only |
| curriculum_map | Own only | Parent only | Parent only | Parent only |
| activity_logs | Own student | Own student | Parent only | Parent only |
| learning_tools | Own student | Parent only | Parent only | Parent only |

### Encryption (v4.0)

Telegram bot tokens stored in `parent_settings.telegram_bot_token` are encrypted using AES-256-GCM:
- **Key:** 256-bit hex key stored as `ENCRYPTION_KEY` secret
- **Format:** `ivHex:ciphertextHex`
- **Encrypt on write:** All edge functions encrypt tokens before storing
- **Decrypt on read:** All edge functions decrypt tokens before using

### Rate Limiting (v4.0)

| Function | Limit | Window |
|----------|-------|--------|
| ai-tutor | 30 requests | Per student per hour |
| parent-alerts | 10 requests | Per parent per hour |

Implemented via the `increment_rate_limit()` SECURITY DEFINER RPC. The `rate_limits` table has no client INSERT policy — only the RPC can write to it.

### Prompt Injection Defense (v4.0)

- Hardened system prompt with explicit refusal instructions
- `sanitizeInput()` function strips injection patterns
- Input length capped at 2,000 characters
- Flagged inputs logged without storing content

### MFA (v4.0)

- Optional TOTP-based MFA for parent accounts
- Enrollment via QR code scanning
- 6-digit verification code
- "Account Protected" badge when active
- Disable requires password re-entry

### Security Audit Results (v4.0)

| # | Check | Result |
|---|-------|--------|
| 1 | RLS on all tables | ✅ PASS |
| 2 | Storage buckets private | ✅ PASS |
| 3 | Edge function JWT validation | ✅ PASS |
| 4 | Student privilege escalation blocked | ✅ PASS |
| 5 | Profile role/student_id locked | ✅ PASS |
| 6 | Telegram token encryption | ✅ PASS |
| 7 | Cross-user data isolation | ✅ PASS |
| 8 | messages_log write protection | ✅ PASS |
| 9 | Input sanitisation | ✅ PASS |
| 10 | Rate limit enforcement | ✅ PASS |
| 11 | New tables audit | ✅ PASS |
| 12 | Secret isolation (VAPID/encryption) | ✅ PASS |

---

## 13. Data Privacy and COPPA/FERPA Compliance

### Privacy Policy

A full Privacy Policy is live at `/privacy`, accessible without authentication, rendered in both EN and HT. It covers:
- Information collected (parent data, student data, device data)
- How data is used (platform operation, notifications, AI tutoring)
- No selling, sharing, or monetizing personal data
- No advertising
- COPPA compliance (parental consent, no child self-registration)
- Data sharing limited to Google (Gemini AI, session-only), Lovable Cloud, Telegram, Twilio
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

"Independent Minds EDU is designed for private family use. It is not a school records system under FERPA. If you represent an institution receiving federal funding, contact legal@independentmindsedu.com before use."

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

## 14. Database Schema

### Tables (19 total)

| Table | Purpose | RLS |
|-------|---------|-----|
| profiles | User profiles and settings | ✅ |
| students | Student records | ✅ |
| daily_plan | Daily schedule blocks | ✅ |
| check_ins | Student mood/progress check-ins | ✅ |
| achievements | Badges and awards | ✅ |
| subject_tracks | Subject configuration | ✅ |
| activity_logs | Track-level activity records | ✅ |
| curriculum_map | Curriculum lesson mapping | ✅ |
| reward_points | Points ledger | ✅ |
| reward_redemptions | Reward claim records | ✅ |
| rewards_catalog | Available rewards | ✅ |
| messages_log | Notification delivery log | ✅ |
| parent_settings | Notification configuration | ✅ |
| learning_tools | Educational resource links | ✅ |
| ai_conversations | AI tutor chat history (v4.0) | ✅ |
| schedule_templates | Reusable schedule templates (v4.0) | ✅ |
| push_subscriptions | Web Push subscriptions (v4.0) | ✅ |
| rate_limits | API rate limit counters (v4.0) | ✅ |
| flagged_inputs | Suspicious AI input metadata (v4.0) | ✅ |

### Key Database Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Trigger: creates profile on signup with adult_confirmed fields |
| `get_my_student_id()` | Returns calling user's student_id |
| `get_my_role()` | Returns calling user's role |
| `is_my_student(_student_id)` | Checks ownership of a student |
| `award_points(...)` | SECURITY DEFINER: awards points safely |
| `redeem_reward(...)` | SECURITY DEFINER: redeems rewards with balance check |
| `get_points_balance(...)` | SECURITY DEFINER: returns points sum |
| `increment_rate_limit(...)` | SECURITY DEFINER: atomic rate limit counter |
| `clear_ai_history(...)` | SECURITY DEFINER: deletes AI conversation for subject |
| `delete_my_account()` | SECURITY DEFINER: deletes user from auth.users |
| `update_updated_at_column()` | Trigger: auto-updates updated_at |

---

## 15. Edge Functions Reference

### Function Inventory

| Function | Trigger | Auth | Rate Limit | Description |
|----------|---------|------|------------|-------------|
| ai-tutor | HTTP POST | JWT | 30/hr/student | AI tutoring via Gemini |
| parent-alerts | HTTP POST | JWT | 10/hr/parent | Send notification alerts |
| hourly-monitor | Cron (hourly) | Cron secret | — | Check missed blocks |
| morning-reminder | Cron (daily) | Cron secret | — | Morning schedule push |
| checkin-reminder | Cron (midday) | Cron secret | — | Check-in reminder |
| daily-report | Cron (evening) | Cron secret | — | End-of-day summary |
| weekly-report | Cron (weekly) | Cron secret | — | Weekly progress report |
| weekly-badge | Cron (weekly) | Cron secret | — | Award weekly badges |
| account-maintenance | Cron (monthly) | Cron secret | — | Data retention lifecycle |
| auth-email-hook | Auth hook | Internal | — | Custom email templates |

### Environment Secrets

| Secret | Used By | Frontend? |
|--------|---------|-----------|
| SUPABASE_URL | All edge functions | Via VITE_ prefix |
| SUPABASE_SERVICE_ROLE_KEY | All edge functions | ❌ Never |
| SUPABASE_ANON_KEY | parent-alerts (JWT verify) | Via VITE_ prefix |
| LOVABLE_API_KEY | ai-tutor (Gemini gateway) | ❌ Never |
| TELEGRAM_BOT_TOKEN | Notification functions | ❌ Never |
| TELEGRAM_CHAT_ID | Notification functions | ❌ Never |
| TWILIO_ACCOUNT_SID | whatsapp.ts | ❌ Never |
| TWILIO_AUTH_TOKEN | whatsapp.ts | ❌ Never |
| TWILIO_WHATSAPP_FROM | whatsapp.ts | ❌ Never |
| ENCRYPTION_KEY | crypto.ts | ❌ Never |
| VAPID_PUBLIC_KEY | webpush.ts | Via VITE_ prefix |
| VAPID_PRIVATE_KEY | webpush.ts | ❌ Never |
| VAPID_EMAIL | webpush.ts | ❌ Never |

---

## 16. Error Handling and Resilience

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

## 17. Testing and Quality Assurance

### Testing Stack

| Tool | Purpose |
|------|---------|
| Vitest | Unit and integration tests |
| Testing Library | Component testing |
| jsdom | DOM simulation |

### Security Testing

The 12-point security audit (Part 7) covers:
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

## 18. Deployment and Infrastructure

### Deployment Pipeline

1. Code pushed to GitHub main branch
2. Lovable auto-builds and deploys the frontend
3. Edge functions deploy automatically on push
4. Database migrations run via Lovable Cloud tools

### Infrastructure

| Component | Provider |
|-----------|----------|
| Frontend hosting | Lovable |
| Database | Lovable Cloud (PostgreSQL 15) |
| Edge Functions | Lovable Cloud (Deno) |
| File Storage | Lovable Cloud |
| Domain | independentmindsedu.com |
| SSL | Automatic via Lovable |

---

## 19. PWA and Mobile Experience

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

## 20. Accessibility

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

### Bilingual Accessibility

All accessibility labels are available in both English and Haitian Creole:
- Skip to content: "Skip to main content" / "Ale nan kontni prensipal"
- Stats bar: role="status" with aria-live
- Student photos: "Photo of [name]" / "Foto [name]"

---

## 21. Known Limitations and Roadmap

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

### Current Limitations

- No native mobile app (PWA only)
- No real-time collaborative editing of schedules
- AI tutor limited to text (no image/voice input)
- No automated curriculum alignment verification
- Push notifications require browser support (not available on older iOS)
- WhatsApp requires Twilio account with approved templates for some regions

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

## 22. Screenshots and Visual Reference

Screenshots reflect v3.0 of the platform. The platform has been updated to v4.0 with new features visible in the live app at https://independentmindsedu.com. Key visual additions in v4.0 include:

- Onboarding progress indicator with gold progress bar
- MFA settings panel with QR code display
- Offline indicator amber banner
- Rewards inspiration gallery (8 suggested cards)
- Notification Settings panel with WhatsApp and channel selector
- AI tutor rate limit banner
- Delete Account confirmation dialog
- Schedule template management buttons
- PDF report download button

For the most current visual reference, visit the live application.

---

*Independent Minds EDU v4.0 — Built with ❤️ by Dany Augustin*  
*© 2026 Independent Minds EDU. All rights reserved.*
