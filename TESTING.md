# Independent Minds EDU — QA Test Checklist

**Version:** 4.1 | **Last Updated:** March 2026 | **Status:** Living Document

> This checklist is designed to be converted into GitHub Issues.
> Each section = 1 GitHub Issue. Each checkbox = 1 test case.

---

## How to Use with GitHub Issues

1. Connect this repo to GitHub via **Project Settings → GitHub**
2. Create a GitHub Project Board (Kanban: To Test → In Progress → Passed → Failed)
3. Create one Issue per section below, copying the checkboxes
4. Assign reviewers and track progress on the board

---

## Section 1 — Authentication & Account Management

**Labels:** `qa`, `auth`, `priority:high`

- [ ] **1.1** Email/password signup creates account and sends verification email
- [ ] **1.2** Unverified email cannot log in (shows appropriate message)
- [ ] **1.3** Email verification link works and activates account
- [ ] **1.4** Login with valid credentials redirects to parent dashboard
- [ ] **1.5** Login with invalid credentials shows error message
- [ ] **1.6** Google OAuth login works end-to-end
- [ ] **1.7** "Forgot Password" sends reset email
- [ ] **1.8** Password reset link works and allows new password
- [ ] **1.9** Session persists across page refresh
- [ ] **1.10** Logout clears session and redirects to login
- [ ] **1.11** MFA (TOTP) setup and verification works
- [ ] **1.12** Account deletion removes all user data
- [ ] **1.13** Profile `role` field is set correctly on signup

---

## Section 2 — Parent Dashboard

**Labels:** `qa`, `dashboard`, `priority:high`

- [ ] **2.1** Dashboard loads with student selector
- [ ] **2.2** Student selector shows all students for logged-in parent
- [ ] **2.3** Switching students updates all dashboard panels
- [ ] **2.4** Category cards show correct progress per track
- [ ] **2.5** Activity feed displays recent entries with timestamps
- [ ] **2.6** Stats bar shows correct points, streak, completion rate
- [ ] **2.7** "Add Student" form creates student linked to parent
- [ ] **2.8** Footer shows correct version and branding

---

## Section 3 — Student Management

**Labels:** `qa`, `students`, `priority:high`

- [ ] **3.1** Add student form validates required fields
- [ ] **3.2** Student profile card displays correct information
- [ ] **3.3** Student records page shows comprehensive data
- [ ] **3.4** Edit student details persists changes
- [ ] **3.5** Subject tracks CRUD (create, read, update, disable)
- [ ] **3.6** Default track templates are created for new students

---

## Section 4 — Daily Schedule & Blocks

**Labels:** `qa`, `schedule`, `priority:high`

- [ ] **4.1** Daily blocks display in correct time order
- [ ] **4.2** "Start" button sets status to "In Progress" with timestamp
- [ ] **4.3** "Complete" button sets status to "Done" with timestamp
- [ ] **4.4** Optional score and notes can be added on completion
- [ ] **4.5** Schedule templates can be created and applied
- [ ] **4.6** CSV bulk upload creates blocks correctly
- [ ] **4.7** Blocks show correct status colors (Planned/In Progress/Done/Missed)

---

## Section 5 — Check-In System

**Labels:** `qa`, `check-in`, `priority:medium`

- [ ] **5.1** Check-in form captures mood, focus, and help request
- [ ] **5.2** "Need Help" triggers SOS alert flow
- [ ] **5.3** Check-in data appears in activity feed
- [ ] **5.4** Latest check-in shows on dashboard

---

## Section 6 — Gamification & Rewards

**Labels:** `qa`, `rewards`, `priority:medium`

- [ ] **6.1** Points are awarded on block completion
- [ ] **6.2** Points balance displays correctly
- [ ] **6.3** Streak counter increments daily
- [ ] **6.4** Category bonus points apply correctly
- [ ] **6.5** Rewards catalog displays available rewards
- [ ] **6.6** Reward redemption deducts correct points
- [ ] **6.7** Redemption queue shows pending requests
- [ ] **6.8** Parent can approve/deny redemptions
- [ ] **6.9** Achievements/badges appear in Trophy Room
- [ ] **6.10** Point settings allow customization per student
- [ ] **6.11** Challenges can be created and tracked

---

## Section 7 — Co-Guardian System

**Labels:** `qa`, `co-guardians`, `priority:high`

- [ ] **7.1** Co-Guardians panel appears above Students section in nav
- [ ] **7.2** Invite form accepts email and calls edge function
- [ ] **7.3** Copy invite link button copies URL to clipboard
- [ ] **7.4** Pending invites show "Pending" badge
- [ ] **7.5** Accept invite page loads with valid token
- [ ] **7.6** Accept invite creates co_guardian row with default permissions
- [ ] **7.7** Expired/invalid tokens show error message
- [ ] **7.8** Permission toggles update database in real-time
- [ ] **7.9** "Full Access" toggle enables all other permissions
- [ ] **7.10** "View Progress" cannot be toggled off (minimum permission)
- [ ] **7.11** Revoke button removes co-guardian access
- [ ] **7.12** Co-guardian sees only permitted students after login
- [ ] **7.13** Co-guardian UI is restricted by their permission set

---

## Section 8 — Unified Message Inbox

**Labels:** `qa`, `inbox`, `priority:high`

- [ ] **8.1** Inbox page loads with filter tabs (All, Unread, SOS, Lessons, Rewards, Streaks)
- [ ] **8.2** Unread count badge shows on nav link
- [ ] **8.3** Badge updates in real-time via realtime subscription
- [ ] **8.4** Clicking a message marks it as read
- [ ] **8.5** "Mark all as read" button works
- [ ] **8.6** Filter tabs correctly filter messages by type
- [ ] **8.7** Empty state shows when no messages exist
- [ ] **8.8** SOS dashboard banner appears only for unread SOS messages
- [ ] **8.9** Banner clears after SOS messages are read in inbox
- [ ] **8.10** `parent-alerts` edge function inserts inbox messages
- [ ] **8.11** `weekly-badge` edge function inserts inbox messages
- [ ] **8.12** `daily-report` edge function inserts inbox messages

---

## Section 9 — AI Tutor (Mr A)

**Labels:** `qa`, `ai-tutor`, `priority:medium`

- [ ] **9.1** Chat interface loads per subject
- [ ] **9.2** Messages send and receive responses
- [ ] **9.3** Conversation history persists across sessions
- [ ] **9.4** "Clear History" removes conversation
- [ ] **9.5** Rate limiting prevents abuse
- [ ] **9.6** Flagged inputs are logged to `flagged_inputs` table

---

## Section 10 — Notifications

**Labels:** `qa`, `notifications`, `priority:medium`

- [ ] **10.1** Telegram notification delivery works
- [ ] **10.2** WhatsApp notification delivery works
- [ ] **10.3** Parent settings allow channel configuration
- [ ] **10.4** Per-parent bot token/chat ID is respected
- [ ] **10.5** Messages log records delivery status

---

## Section 11 — Edge Functions & Cron Jobs

**Labels:** `qa`, `edge-functions`, `priority:high`

- [ ] **11.1** `daily-report` runs at 19:00 Haiti time
- [ ] **11.2** `weekly-badge` runs Sunday 19:00 Haiti time
- [ ] **11.3** `morning-reminder` fires correctly
- [ ] **11.4** `checkin-reminder` fires correctly
- [ ] **11.5** `hourly-monitor` checks missed blocks
- [ ] **11.6** `parent-alerts` sends notifications + inbox messages
- [ ] **11.7** `send-guardian-invite` sends invite email
- [ ] **11.8** `accept-guardian-invite` processes token acceptance
- [ ] **11.9** `ai-tutor` handles requests with rate limiting
- [ ] **11.10** `auth-email-hook` sends branded emails
- [ ] **11.11** CRON_SECRET is validated on cron-triggered functions

---

## Section 12 — Internationalization (i18n)

**Labels:** `qa`, `i18n`, `priority:medium`

- [ ] **12.1** Language dropdown shows all 10 languages
- [ ] **12.2** Switching language updates all UI text
- [ ] **12.3** Language preference persists in localStorage
- [ ] **12.4** Language preference syncs to user profile in DB
- [ ] **12.5** Guardian/inbox translation keys exist for all 10 languages
- [ ] **12.6** RTL layout works for Arabic (ar)
- [ ] **12.7** CJK characters render correctly (zh, ja)

---

## Section 13 — Admin Panel

**Labels:** `qa`, `admin`, `priority:medium`

- [ ] **13.1** Admin login redirects to admin dashboard
- [ ] **13.2** Overview shows correct aggregate stats
- [ ] **13.3** Students table is sortable and filterable
- [ ] **13.4** Engagement page shows streak leaderboards
- [ ] **13.5** Rewards analytics show points economy
- [ ] **13.6** System health shows edge function status
- [ ] **13.7** Messages page shows delivery logs
- [ ] **13.8** Users page shows parent accounts and co-guardians
- [ ] **13.9** Non-admin users cannot access admin routes
- [ ] **13.10** Auto-refresh updates metrics without reload

---

## Section 14 — Security & RLS

**Labels:** `qa`, `security`, `priority:critical`

- [ ] **14.1** `is_my_student()` prevents cross-tenant data access
- [ ] **14.2** `has_role()` correctly gates admin access
- [ ] **14.3** `has_guardian_permission()` enforces co-guardian limits
- [ ] **14.4** Unauthenticated requests to protected tables return error
- [ ] **14.5** Co-guardian cannot elevate own permissions
- [ ] **14.6** Invite tokens are single-use
- [ ] **14.7** Expired invite tokens are rejected
- [ ] **14.8** RLS policies on all tables prevent unauthorized access

---

## Section 15 — PWA & Offline

**Labels:** `qa`, `pwa`, `priority:low`

- [ ] **15.1** App is installable as PWA
- [ ] **15.2** Offline indicator shows when disconnected
- [ ] **15.3** Offline queue stores actions for later sync
- [ ] **15.4** Sync manager processes queued actions on reconnect

---

## Section 16 — Responsive Design

**Labels:** `qa`, `responsive`, `priority:medium`

- [ ] **16.1** Dashboard renders correctly on mobile (375px)
- [ ] **16.2** Dashboard renders correctly on tablet (768px)
- [ ] **16.3** Dashboard renders correctly on desktop (1280px+)
- [ ] **16.4** Navigation collapses to mobile menu
- [ ] **16.5** All modals/dialogs are usable on mobile
- [ ] **16.6** Language dropdown is accessible on all screen sizes

---

*Total: 100+ test cases across 16 sections*
*Generated: March 2026 | Independent Minds EDU v4.1*
