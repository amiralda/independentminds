# 🚀 Independent Minds EDU

**A Dynamic Academic Management & Milestone Tracking System.**

Independent Minds EDU is a professional-grade educational ecosystem designed to empower students with autonomy through data-driven goal setting. The platform allows educators and parents to establish custom academic timeframes, providing a clear roadmap for students to master their curriculum at a sustainable yet high-performing pace.

---

## 🎯 The Mission

To provide a flexible framework for academic success. The platform calculates and monitors the necessary **Velocity** required to reach user-defined milestones, fostering discipline and accountability through real-time feedback loops.

---

## 🛠️ Technical Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite) & TypeScript with Tailwind CSS |
| **Backend** | Supabase for real-time data persistence & secure authentication |
| **Business Logic** | Supabase Edge Functions (Deno) for automated notification triggers |
| **Notification Engine** | Telegram Bot API (AmiralDaBot) for instant mobile alerts |
| **Domain** | [independentmindsedu.com](https://independentmindsedu.com) |

---

## ✨ Core Features

### 📊 Dynamic Mission Control

- **Customizable Timeframes:** Define start and end dates for academic cycles. The system automatically adjusts daily targets based on the remaining curriculum.
- **Real-Time Pace Indicator:** A visual status engine (*On Track / Off Track*) that adapts dynamically to the student's historical performance.
- **Consistency Streak:** A habit-building tool that gamifies daily engagement to build long-term study habits.
- **'Mark Done' Synchronization:** One-click logging of activities with instant cloud updates and parent notification.

### 🎯 Multi-Track Learning System *(NEW)*

- **Subject Tracks:** Define multiple independent learning tracks (e.g., Time4Learning, Rosetta Stone Spanish, Coding) each with its own daily target, unit type, and color-coded category.
- **Category Cards:** Per-track progress visualization with individual progress bars, Mark Done buttons, and daily goals — replacing the single-progress-bar model.
- **Admin Track Management:** Full CRUD control for parents to add, edit, enable/disable, and delete learning tracks from the Settings panel.
- **Activity Logging:** Every completed session is timestamped and linked to its specific track for granular analytics.

### 🔔 Parent Command Center

- **Automated Cloud Alerts:** Instant Telegram notifications for every milestone reached or lesson completed, replacing traditional SMS systems.
- **Dynamic Track Notifications:** When a student marks a track complete, the Telegram bot identifies the specific track and reports: *"Christian just completed a [Track Name] session! Total today: [X/Target]."*
- **Urgent Support System:** A *'Need Help'* trigger that allows students to request immediate intervention with contextual comments.
- **Activity Feed:** A real-time admin view showing exactly what time each subject was started and finished, with manual **Undo** and **Override** capabilities.
- **Analytics Dashboard:** A comprehensive view of student velocity, historical trends, and activity logs.

### 🏆 Achievement & Recognition

- **The Trophy Room:** A digital reward system for hitting daily and weekly performance benchmarks (e.g., *'20-Lesson Legend'*, *'Weekly Warrior'*).
- **Automated Certification:** System-generated achievement certificates upon the completion of specific academic blocks or chapters.

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `students` | Student profiles, language preferences, contact info |
| `profiles` | Auth-linked user profiles with roles (student/parent) |
| `daily_plan` | Scheduled time-block activities per day |
| `subject_tracks` | Multi-track learning configuration (name, target, unit type, color, enabled) |
| `activity_logs` | Per-track activity entries with timestamps, scores, and status |
| `check_ins` | Student mood, focus, and help-request entries |
| `achievements` | Earned badges and certificates |
| `curriculum_map` | Lesson-level curriculum reference data |
| `messages_log` | Telegram notification delivery log |

---

## 🗺️ Future Roadmap & Vision

### Communication & Collaboration

- **Integrated Academic Chat:** A secure, in-platform messaging system for real-time discussion between parents and students.
- **Evidence Upload System:** Capability for students to upload photos, PDFs, or audio recordings of offline assignments and physical projects.
- **Interactive Whiteboard:** A shared digital space for remote tutoring sessions and visual brainstorming.

### AI-Powered Learning Assistance

- **AI Concept Tutor:** Integration of an LLM to provide instant explanations for complex subjects and homework help.
- **Smart Study Summaries:** Automated daily AI-generated briefings for parents, summarizing the student's focus areas and challenges.
- **Predictive Graduation Forecasting:** Machine learning algorithms to predict completion dates based on historical velocity and subject difficulty.

### Advanced Analytics & Reporting

- **Automated Monthly Performance Reports:** System-generated PDF summaries for deep-dive reviews of academic trends.
- **Subject-Specific Heatmaps:** Visual data representation showing which subjects the student masters quickly versus those requiring more time.
- **Focus-Time Tracking:** Analytics to monitor active study sessions versus idle time on the platform.

### Enhanced Gamification & Engagement

- **Point-Based Reward Marketplace:** A system where students earn *'Digital Credits'* for consistency, redeemable for rewards defined by parents.
- **Customizable Avatars & Themes:** Unlockable UI skins and profile customization to enhance student ownership of the platform.

### Connectivity & Infrastructure

- **Offline-First Synchronization:** Enhanced local storage to allow progress logging during internet outages, syncing automatically once reconnected.
- **Multi-Student Support:** Architecture expansion to manage multiple student profiles under a single administrative account.
- **Google Calendar Integration:** Automatic syncing of academic deadlines, scheduled breaks, and exam dates.

---

## ⚙️ Environment Configuration

To enable the notification engine, the following backend secrets are required:

| Secret | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | API Token for the custom bot |
| `TELEGRAM_CHAT_ID` | Destination ID for parent notifications |

---

> Developed with 💡 by **Dany Augustin** — Technology Strategist, Visionary & Social Entrepreneur
