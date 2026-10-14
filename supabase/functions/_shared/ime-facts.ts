// Mete fichye sa a ajou chak fwa yon nouvo feature soti. Atik yo dekri sa ki ladan l sèlman.
//
// Fact base for generated newsletter articles (generate-article). It lists
// ONLY what is deployed in production. Built on 2026-10-14 from the code and
// production notes: OPERATIONAL_MANUAL_v4.md §2/§18 (corrected 2026-10-11),
// the deployed edge function list, src/pages/, src/config/plans.ts and the
// notification migrations. Pure TypeScript, no imports.
// Corrected 2026-10-14 after the first test article: templates are only the
// weeks a family saved (src/components/ScheduleTemplates.tsx; no built-ins).

export const IME_FACTS = `
INDEPENDENT MINDS EDU (IME) — WHAT EXISTS TODAY

IME is a web platform for families who homeschool or support their children's learning at home. It works in any modern browser and can be installed on a phone or computer from the browser (installable web app). Parents (and the adults they invite) plan the school day; students follow it, mark work done and check in.

DAILY SCHEDULE
- For each student, the parent builds a daily schedule of tasks ("blocks"): a subject, a start time and an end time.
- Saved weeks ("templates"): the parent can save a student's current week (Monday to Friday) under a name of their choice, then apply that saved week to the current week of a student later. Saved weeks belong to the family. There are NO built-in or ready-made templates: a family only has the weeks it saved itself, and a new family has none.
- "Copy last week": copies a student's tasks from last Monday-Friday to this week.
- Schedule import from a file: the parent can download a CSV template, or upload a schedule file (CSV, TSV, TXT, PDF, image or Excel .xlsx). Simple CSV files are read in the browser; other files are read by AI. Nothing is saved until the parent checks a preview of every row and confirms the import.

STUDENTS
- A parent adds students to the family account.
- A student can get their own login: the parent creates it and receives a "set your password" link to give to the student. The parent can generate a new link later.
- On their own dashboard, the student sees today's tasks, starts them and marks them done.

CHECK-IN
- Students submit a check-in: how they feel (mood), how focused they are, how many tasks they finished, an optional comment, and whether they need help.

AUTOMATIC EMAILS TO THE FAMILY
- Morning plan email: the day's tasks for each student, every morning.
- Check-in reminder email: sent late morning, only if the student has not checked in yet that day.
- Daily report email: in the evening — tasks done and not done, check-ins, help requests.
- Weekly badge email: once a week, only if the student made progress that week.
- These emails are sent to families with an active subscription or an active trial.
- Each email goes to the parent AND to every co-guardian of the family.
- Notification preferences: every one of these emails has a link at the bottom. Each person can, per type of email or for all of them, pause it (1 week, 2 weeks or 1 month), stop it, or turn it back on. Each person only controls their own emails. No login is needed for this page.

CO-GUARDIANS
- The parent can invite other adults (a co-parent, a grandparent, a tutor...) as co-guardians with an invite link that the parent sends themselves.
- A co-guardian has the same access as the parent to all of the family's students, and receives the same automatic emails.
- The parent can see active co-guardians and pending invites, and remove a co-guardian at any time.

MANAGERS (organizations)
- A Manager is an organization that supports several families. An admin approves Manager access on request.
- A Manager can create parent accounts for the families it supports (the parent gets an invite link to set a password) and can cover those families' subscription.
- Managers do not receive the families' automatic emails (only the parent and co-guardians do).

POINTS, BADGES AND REWARDS
- Students earn points for completed tasks and check-ins.
- Badges and achievements are shown in the student's trophy room; a weekly badge email celebrates weekly progress.
- The parent creates a rewards catalog (names, point costs); students request rewards with their points, and the parent fulfills them.

MR A — AI TUTOR (subscription required)
- Mr A is an AI study helper for students, with a chat per subject.
- It explains step by step, adapts to the student's grade level and answers in the student's language.
- It guides students toward the answer instead of simply giving it, stays on school topics, and encourages a student in distress to talk to a trusted adult.
- Usage is limited per student per hour.
- Requires an active subscription or an active trial.

WEEKLY PROGRESS REPORT (subscription required)
- Parents see weekly progress: completion rate, subject breakdown, streak, points, and mood from check-ins.
- The report can be downloaded as a PDF.
- Requires an active subscription or an active trial.

LANGUAGES
- The whole interface is available in 10 languages: English, Haitian Creole (Kreyòl), French, Spanish, Portuguese, Arabic, Chinese, German, Japanese, Russian. Each person picks their language and it is remembered.

SUBSCRIPTIONS
- Paid plans are handled through Stripe (secure checkout and a billing portal to manage the subscription).
- New parents get a 14-day free trial when they confirm their email.
- Do not state prices: pricing is still under review.

ACCOUNT AND SECURITY
- Sign-in with email and password; optional two-factor authentication (authenticator app) for parents.
- The parent who creates the account confirms they are an adult and the student's parent or legal guardian.
- Every family's data is isolated from other families.

SA KI PA EGZISTE — WHAT DOES NOT EXIST (never describe or imply these)
- No mobile app in the App Store or Google Play (only the installable web app).
- No Telegram or WhatsApp messages to parents. Family notifications are by email only.
- No Web Push / browser push notifications.
- No live classes, no video lessons, no teachers provided by IME.
- No automatic grading or marks; IME does not grade work.
- No public archive of newsletter articles yet.
- No Google sign-in (currently unavailable).
- No per-permission controls for co-guardians (they have full family access).
- No built-in or pre-made schedule templates (not for elementary, middle school, a "flexible week" or anything else); families only reuse weeks they saved themselves.
- No curriculum or course content sold or provided by IME; families choose their own materials.
`.trim();
