# 🎓 Independent Minds EDU

<!-- Replace OWNER/REPO below once the GitHub repository is connected -->
![CI](https://github.com/OWNER/REPO/actions/workflows/test.yml/badge.svg?branch=main)

**A Multi-Tenant Academic Management & Milestone Tracking SaaS Platform**

> *Learn Smart. Grow Every Day.* — independentmindsedu.com

---

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite) · TypeScript · Tailwind CSS · shadcn/ui |
| **Backend** | Lovable Cloud (Supabase) — Postgres, Auth, Edge Functions |
| **Notifications** | Telegram Bot API · Twilio WhatsApp · Web Push (VAPID) |
| **Auth** | Email/Password + Google OAuth · Optional MFA (TOTP) |
| **i18n** | 10 languages: EN 🇺🇸 · HT 🇭🇹 · FR 🇫🇷 · ES 🇪🇸 · PT 🇧🇷 · AR 🇸🇦 · ZH 🇨🇳 · DE 🇩🇪 · JA 🇯🇵 · RU 🇷🇺 |
| **Admin Panel** | Role-based admin surface with real-time analytics |

---

## 🔐 Multi-Tenant Security Model

```
Parent (auth.users) ──► profiles (role: parent)
    │
    ├──► students (parent_id → auth.users.id)
    │       │
    │       ├──► subject_tracks
    │       ├──► activity_logs
    │       ├──► daily_plan
    │       ├──► check_ins
    │       ├──► achievements
    │       └──► inbox_messages
    │
    ├──► co_guardians (invited co-parents with granular permissions)
    ├──► guardian_invites (token-based invite system)
    └──► user_roles (role-based access: parent, student, admin)
```

- **RLS Isolation**: `is_my_student()` security-definer function ensures parents only access their own students' data
- **Zero Cross-Tenant Leakage**: Every table enforces `is_my_student(student_id)` in all policies
- **Co-Guardian Permissions**: `has_guardian_permission()` security-definer function for granular access control
- **Admin Isolation**: `has_role()` security-definer function prevents RLS recursion for admin read access
- **Per-Parent Notifications**: `parent_settings` table stores individual bot tokens and chat IDs

---

## ✨ Core Features

### 📊 Parent Command Center
- **Student Selector**: Manage multiple students from a single dashboard
- **Co-Guardian System**: Invite co-parents with granular permission toggles (view progress, receive SOS, approve rewards, edit lessons, full access)
- **Unified Inbox**: Read-once alert system with filter tabs (All, Unread, SOS, Lessons, Rewards, Streaks)
- **Welcome Onboarding**: 5-step guided setup with progress indicator
- **Track Management**: Add/edit/disable learning tracks with custom targets and categories
- **Activity Feed**: Timestamped logs with undo/override controls
- **Schedule Builder**: Weekly planning with templates and CSV bulk upload
- **Rewards Management**: Create/manage rewards catalog with redemption approval queue
- **Notification Settings**: Telegram, WhatsApp, and channel selection
- **Weekly Reports**: Analytics with branded PDF export
- **Certificates**: Generate completion certificates
- **Student Records**: Comprehensive student profile management
- **Learning Tools Hub**: Manage educational resource links

### 🎯 Student Dashboard
- **Category Cards**: Color-coded progress per learning track
- **Mark Done**: One-click completion with optional score and notes
- **Daily Blocks**: Time-slotted schedule with start/complete workflow
- **Check-In System**: Mood, focus, and help-request tracking
- **Trophy Room**: Achievement badges and certificates
- **Rewards Shop**: Browse and redeem rewards with points
- **AI Tutor (Mr A)**: Per-subject chat with conversation history

### 🛡️ Admin Panel
- **Overview**: Total students, active today, completion rates, points economy
- **Students**: Sortable table with pace, streak, and activity data
- **Engagement**: Streak leaderboards, mood charts, daily completion trends
- **Rewards**: Points economy analytics, popular rewards, pending redemptions
- **System Health**: Edge function status, rate limits, flagged AI inputs
- **Messages**: Delivery rates, channel breakdown, delivery logs
- **Users**: Parent accounts, co-guardian overview, merge requests, role management
- **Real-time Refresh**: Auto-updating metrics without page reload

### 👥 Co-Guardian System
- **Invite Flow**: Token-based email invites with 7-day expiry
- **Permission Toggles**: View progress, receive SOS, approve rewards, edit lessons, full access
- **Edge Functions**: `send-guardian-invite` and `accept-guardian-invite` for secure server-side processing
- **Accept Page**: `/accept-invite?token=...` with auth-gated acceptance flow

### 📬 Unified Message Inbox
- **Read-Once Alerts**: Dashboard banners clear after reading in inbox
- **Filter Tabs**: All, Unread, SOS, Lessons, Rewards, Streaks
- **Real-time Badge**: Unread count updates live via Supabase realtime
- **Edge Function Integration**: parent-alerts, weekly-badge, and daily-report auto-populate inbox

### 🌍 Internationalization (10 Languages)
- Full translations for EN, HT, FR, ES, PT, AR, ZH, DE, JA, RU
- 150+ translation keys including co-guardian and inbox features
- Language preference persisted to localStorage and database
- Dropdown language selector accessible from every view

### 🔔 Smart Notifications
- Badge earned alerts with student name
- Urgent help intervention requests (SOS)
- Track completion updates
- Weekly progress summaries
- Streak milestone notifications
- Reward redemption alerts
- Per-parent Telegram/WhatsApp routing
- Inbox message creation alongside external notifications

---

## 📋 Default Track Templates

| Track | Target | Unit | Color |
|---|---|---|---|
| Core Academics | 10/day | Lessons | Gold |
| Reading & Literacy | 20/day | Minutes | Green |
| Language Lab | 1/day | Sessions | Blue |
| Special Projects | 1/day | Sessions | Purple |

---

## 🗄️ Database Schema (25 tables)

| Table | Purpose |
|---|---|
| `profiles` | Auth-linked user profiles with role, language pref |
| `students` | Student records with `parent_id` FK |
| `subject_tracks` | Learning categories with targets and colors |
| `activity_logs` | Timestamped progress entries per track |
| `daily_plan` | Time-blocked daily schedule |
| `check_ins` | Student mood/focus self-reports |
| `achievements` | Earned badges and milestones |
| `parent_settings` | Per-parent notification configuration |
| `reward_points` | Points ledger |
| `reward_redemptions` | Reward claim records |
| `rewards_catalog` | Available rewards |
| `messages_log` | Notification delivery log |
| `ai_conversations` | AI tutor chat history |
| `schedule_templates` | Reusable schedule templates |
| `push_subscriptions` | Web Push subscriptions |
| `rate_limits` | API rate limit counters |
| `flagged_inputs` | Suspicious AI input metadata |
| `learning_tools` | Educational resource links |
| `curriculum_map` | Curriculum lesson mapping |
| `user_roles` | Role-based access control |
| `co_guardians` | Co-guardian relationships & permissions |
| `guardian_invites` | Invite tokens for co-guardians |
| `inbox_messages` | Unified parent message inbox |
| `merge_requests` | Account merge requests |
| `challenges` | Student challenge tracking |

---

## ⚙️ Edge Functions (14)

| Function | Purpose |
|---|---|
| `ai-tutor` | AI tutoring via Gemini (rate-limited) |
| `parent-alerts` | Send notification alerts + inbox messages |
| `hourly-monitor` | Check missed blocks (cron) |
| `morning-reminder` | Morning schedule push (cron) |
| `checkin-reminder` | Check-in reminder (cron) |
| `daily-report` | End-of-day summary + inbox (cron) |
| `weekly-report` | Weekly progress report (cron) |
| `weekly-badge` | Award weekly badges + inbox (cron) |
| `account-merge` | Account merge processing |
| `auth-email-hook` | Custom branded email templates |
| `send-guardian-invite` | Send co-guardian invite emails |
| `accept-guardian-invite` | Process co-guardian invite acceptance |

---

## 🔑 Environment Secrets

| Secret | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Edge function database access |
| `TELEGRAM_BOT_TOKEN` | Telegram notification delivery |
| `TELEGRAM_CHAT_ID` | Default notification destination |
| `ENCRYPTION_KEY` | AES-256-GCM token encryption |
| `twilioSID` / `twilioSecret` | Twilio WhatsApp API |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sender number |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push authentication |
| `LOVABLE_API_KEY` | AI gateway access |

---

## 🗺️ Roadmap

- [ ] Voice input for AI tutor
- [ ] Curriculum marketplace for sharing lesson plans
- [ ] Multi-student household analytics dashboard
- [ ] Native mobile app (React Native)
- [ ] Parent-teacher communication features
- [ ] Integration with Time4Learning API
- [ ] Student-to-student study groups

---

*Independent Minds EDU v4.1 — Built with Love by KòdLabo*
*© 2026 Independent Minds EDU. All rights reserved.*
