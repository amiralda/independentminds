# 🎓 Independent Minds EDU

**A Multi-Tenant Academic Management & Milestone Tracking SaaS Platform**

> *Learn Smart. Grow Every Day.* — independentmindsedu.com

---

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite) · TypeScript · Tailwind CSS · shadcn/ui |
| **Backend** | Lovable Cloud (Supabase) — Postgres, Auth, Edge Functions |
| **Notifications** | Telegram Bot API (per-parent routing) |
| **Auth** | Email/Password + Google OAuth |
| **i18n** | English 🇺🇸 + Haitian Creole 🇭🇹 |

---

## 🔐 Multi-Tenant Security Model

```
Parent (auth.users) ──► profiles (role: parent)
    │
    └──► students (parent_id → auth.users.id)
            │
            ├──► subject_tracks
            ├──► activity_logs
            ├──► daily_plan
            ├──► check_ins
            └──► achievements
```

- **RLS Isolation**: `is_my_student()` security-definer function ensures parents only access their own students' data
- **Zero Cross-Tenant Leakage**: Every table enforces `is_my_student(student_id)` in all policies
- **Per-Parent Telegram**: `parent_settings` table stores individual bot tokens and chat IDs

---

## ✨ Core Features

### 📊 Parent Command Center
- **Student Selector**: Manage multiple students from a single dashboard
- **Welcome Onboarding**: First-login modal with guided setup and default track templates
- **Track Management**: Add/edit/disable learning tracks with custom targets and categories
- **Activity Feed**: Timestamped logs with undo/override controls
- **Schedule Builder**: Weekly planning with CSV bulk upload
- **Telegram Settings**: Per-parent bot configuration for real-time notifications

### 🎯 Student Dashboard
- **Category Cards**: Color-coded progress per learning track
- **Mark Done**: One-click completion with optional score and notes
- **Daily Blocks**: Time-slotted schedule with start/complete workflow
- **Check-In System**: Mood, focus, and help-request tracking
- **Trophy Room**: Achievement badges and certificates

### 🌍 Internationalization
- Full English 🇺🇸 and Haitian Creole 🇭🇹 support
- Language preference persisted to localStorage and database
- Toggle accessible from every view

### 🔔 Smart Notifications
- Badge earned alerts with student name
- Urgent help intervention requests
- Track completion updates
- Weekly progress summaries
- Per-parent Telegram routing

---

## 📋 Default Track Templates

| Track | Target | Unit | Color |
|---|---|---|---|
| Core Academics | 10/day | Lessons | Gold |
| Reading & Literacy | 20/day | Minutes | Green |
| Language Lab | 1/day | Sessions | Blue |
| Special Projects | 1/day | Sessions | Purple |

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Auth-linked user profiles with role, language pref |
| `students` | Student records with `parent_id` FK |
| `subject_tracks` | Learning categories with targets and colors |
| `activity_logs` | Timestamped progress entries per track |
| `daily_plan` | Time-blocked daily schedule |
| `check_ins` | Student mood/focus self-reports |
| `achievements` | Earned badges and milestones |
| `parent_settings` | Per-parent Telegram bot configuration |

---

## ⚙️ Environment Secrets

| Secret | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Default Telegram bot API token |
| `TELEGRAM_CHAT_ID` | Default notification destination |

---

## 🗺️ Roadmap

- [ ] AI Concept Tutor (Lovable AI / Gemini)
- [ ] Evidence Upload System
- [ ] Predictive Graduation Forecasting
- [ ] Offline-First Synchronization
- [ ] Point-Based Reward Marketplace

---

*Developed with 💡 by Dany Augustin — Technology Strategist & Social Entrepreneur*
