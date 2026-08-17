# 📚 STORY RACE GAME
### AI-Powered Gamified Reading & Comprehension Platform

> A full-stack educational web application that transforms story-based learning into a competitive, gamified experience for students, guided by teachers and overseen by administrators — all powered by Google Gemini AI.

---

## 🛠️ TECH STACK

### Frontend
| Layer | Technology |
|---|---|
| Framework | **React** (via **Vite**) |
| Language | **TypeScript** |
| Styling | **Pure CSS** (Custom Glassmorphism Design System) |
| Routing | **React Router DOM** |
| Icons | **Lucide React** |
| PDF/Certificate | **html2canvas + jsPDF** |
| QR Scanning | **@zxing/library** |

### Backend
| Layer | Technology |
|---|---|
| Runtime | **Node.js** |
| Framework | **Express.js** |
| Database | **MongoDB** (via **Mongoose** ODM) |
| Auth | **Firebase Auth** (UID linking) + **JWT** |
| AI | **Google Gemini AI API** |
| Middleware | Custom Auth Guard, Role Guard, Audit Logger |

---

## 📁 PROJECT STRUCTURE

```
STORY RACW/
├── frontend/                    # React + Vite client app
│   ├── public/                  # Static assets (logo, images)
│   └── src/
│       ├── components/          # Reusable UI components
│       │   ├── ChatView.tsx         # Shared real-time chat view
│       │   ├── DialogProvider.tsx   # Global alert/confirm dialog system
│       │   ├── JoinSectionPanel.tsx # Join-class panel via code
│       │   ├── ProtectedRoute.tsx   # Auth-gated route wrapper
│       │   ├── QrCodeScanner.tsx    # Camera-based QR code scanner
│       │   ├── levelMap/            # Interactive level map canvas & CSS
│       │   ├── quiz/                # Quiz player component & styles
│       │   └── story/               # Story page renderer
│       ├── context/             # React Context (AuthContext)
│       ├── layouts/
│       │   └── DashboardLayout.tsx  # Master layout: sidebar, topbar, notifications
│       ├── pages/
│       │   ├── SignIn.tsx
│       │   ├── SignUp.tsx
│       │   ├── ForgotPassword.tsx
│       │   ├── NotificationsPage.tsx
│       │   ├── admin/
│       │   │   ├── AdminDashboard.tsx        # Admin home with stats & charts
│       │   │   ├── AdminUsers.tsx            # User management table
│       │   │   ├── AdminUserDetail.tsx       # Per-user view + audit activity feed
│       │   │   ├── AdminAcademicYear.tsx     # Academic year management
│       │   │   ├── AdminAcademicYearDetail.tsx # Detailed year view with sections
│       │   │   ├── AdminSectionDetail.tsx    # Section management
│       │   │   ├── AdminRecords.tsx          # Audit log viewer
│       │   │   ├── AdminSettings.tsx         # System settings
│       │   │   ├── AdminProfile.tsx          # Admin profile with heatmap
│       │   │   └── AdminChat.tsx             # Admin chat (stub)
│       │   ├── teacher/
│       │   │   ├── TeacherDashboard.tsx      # Teacher home with class stats
│       │   │   ├── TeacherClasses.tsx        # Class list view
│       │   │   ├── TeacherClassDetail.tsx    # Detailed class management
│       │   │   ├── TeacherStoryDashboard.tsx # Campaign list
│       │   │   ├── TeacherStoryBuilder.tsx   # AI campaign builder (largest file)
│       │   │   ├── TeacherStoryOverview.tsx  # Campaign overview & preview
│       │   │   ├── TeacherProfile.tsx        # Teacher profile with heatmap
│       │   │   └── TeacherChat.tsx           # Teacher chat (stub)
│       │   └── student/
│       │       ├── StudentDashboard.tsx      # Student home with XP & coins
│       │       ├── StudentStoryboard.tsx     # Main gameplay — level map & quiz
│       │       ├── StudentStoryReader.tsx    # Story reading view
│       │       ├── StudentSection.tsx        # Section enrollment & announcements
│       │       ├── StudentProfile.tsx        # Student profile with heatmap
│       │       ├── StudentAwards.tsx         # Rewards & certificate gallery
│       │       ├── StudentLeaderboard.tsx    # Class leaderboard
│       │       ├── StudentSettings.tsx       # Account settings
│       │       └── StudentChat.tsx           # Student chat (stub)
│       ├── services/            # API call helpers
│       │   ├── api.ts               # Axios base instance
│       │   ├── authApi.ts           # Sign in, sign up, password reset
│       │   ├── usersApi.ts          # User CRUD, stats, profile
│       │   ├── auditApi.ts          # Audit log fetching
│       │   ├── chatApi.ts           # Chat messages
│       │   ├── notificationsApi.ts  # Notification read/list
│       │   └── settingsApi.ts       # System settings
│       ├── themes/              # Campaign visual theme definitions
│       ├── types/               # TypeScript types (Quiz, StoryLayout, etc.)
│       ├── utils/
│       │   └── awardCertificate.ts  # PDF certificate generation logic
│       ├── App.tsx              # Landing page + footer + routing
│       ├── index.css            # Global CSS (tokens, animations, logo logic)
│       └── dashboard.css        # Dashboard-wide design system
│
└── backend/                     # Express.js API server
    └── src/
        ├── config/              # DB connection, Firebase admin config
        ├── controllers/
        │   ├── authController.js         # Register, login, password reset
        │   ├── userController.js         # User CRUD & progress tracking
        │   ├── campaignController.js     # AI campaign creation & level progress
        │   ├── sectionController.js      # Class/section management
        │   ├── academicYearController.js # Academic year setup
        │   ├── auditController.js        # Audit log querying
        │   ├── chatController.js         # Real-time chat messages
        │   ├── notificationController.js # Notification delivery
        │   └── settingsController.js     # Global platform settings
        ├── models/
        │   ├── User.js           # User schema (role, XP, coins, streak, avatar)
        │   ├── Campaign.js       # Story campaign with AI-generated levels
        │   ├── Section.js        # Class section with members & join code
        │   ├── AcademicYear.js   # Academic year metadata
        │   ├── AuditLog.js       # System-wide action audit trail
        │   ├── Announcement.js   # Section announcements
        │   ├── Notification.js   # User notification records
        │   ├── Conversation.js   # Chat conversation threads
        │   ├── Message.js        # Individual chat messages
        │   └── SystemSettings.js # Global configurable platform settings
        ├── middleware/           # Auth middleware, role guards
        ├── routes/               # API route definitions
        └── utils/                # Shared utilities (audit logger, etc.)
```

---

## ✅ COMPLETE FEATURE LOG (Everything We Built & Fixed)

### 🔐 Authentication
- [x] Sign Up with role selection (Student / Teacher)
- [x] Sign In with email/password via Firebase Auth + JWT
- [x] Forgot Password → email-based reset flow
- [x] Protected routes per role (Student, Teacher, Admin)

### 🏠 Landing Page (`App.tsx`)
- [x] Hero section, Features section, How-it-Works section
- [x] Animated navigation bar (scrolled state)
- [x] Dark / Light mode toggle persisted in localStorage
- [x] **Footer redesign:** Removed "Pricing", "Leaderboards", "Teacher Portal" & "Blog" links
- [x] **Footer link categories updated:**
  - **Platform:** About Us, Features, How it Works
  - **Resources:** Help Center & FAQ, Contact Support, Reading Guides, System Status
  - **Legal:** Terms of Service, Privacy Policy, Child Privacy, Data Security
- [x] **Clickable Info Modals** on all Resources & Legal links (pop-up with readable content)
- [x] New official logo integrated with CSS blend mode transparency

### 🎨 Global Branding & Logo
- [x] Official JPEG logo (`774305900_...jpg`) deployed across all pages
- [x] `mix-blend-mode: multiply` for light backgrounds → strips white background
- [x] `filter: invert(1) + mix-blend-mode: screen` for dark backgrounds
- [x] Special footer override: logo inverts to white on dark footer
- [x] Updated in: SignIn, SignUp, ForgotPassword, DashboardLayout, App.tsx (nav + footer), awardCertificate.ts

### 🎭 Dashboard Layout (`DashboardLayout.tsx`)
- [x] Collapsible sidebar with role-specific navigation items
- [x] Mobile hamburger menu (drawer-style)
- [x] Global Dark/Light theme toggle
- [x] Real-time notification bell (badge, panel, mark-all-read)
- [x] **Notification bell hidden for Admin role** (Admin has no notifications)
- [x] Avatar with initials display, role label

### 🎒 Student Portal
| Page | Features |
|---|---|
| **StudentDashboard** | XP, Coins, Streak stats; campaign list; quick-join via code |
| **StudentStoryboard** | Full gameplay — Level map, story reader, vocabulary, AI quiz, coin rewards, certificate unlock |
| **StudentStoryReader** | Storyboard-layout story pages with image/text rendering |
| **StudentSection** | Class info, join via code or QR, announcements feed |
| **StudentAwards** | Certificate gallery, downloadable PDF awards |
| **StudentLeaderboard** | Class ranking by XP/coins |
| **StudentProfile** | Avatar upload, stats, daily streak, **dynamic activity heatmap** |
| **StudentSettings** | Update display name, password change |

### 👩‍🏫 Teacher Portal
| Page | Features |
|---|---|
| **TeacherDashboard** | Overview: total classes, students, published campaigns |
| **TeacherClasses** | Class list; create new class |
| **TeacherClassDetail** | Student list, section code, announcements, QR code display |
| **TeacherStoryDashboard** | Published & draft campaign list |
| **TeacherStoryBuilder** | **AI Campaign Builder** — generates full multi-level stories + quizzes via Gemini AI. Manual editing also supported. |
| **TeacherStoryOverview** | Preview campaign, publish/unpublish, view level detail |
| **TeacherProfile** | Avatar, streak, XP stats, **dynamic calendar-bound heatmap** |

### 🛡️ Admin Portal
| Page | Features |
|---|---|
| **AdminDashboard** | System-wide stats: users, sections, campaigns, active sessions |
| **AdminUsers** | Full user table with search, filter by role; view user detail |
| **AdminUserDetail** | User info card + **Real Audit Activity Feed** (fetches from AuditLogs by user email, scrollable, no technical action tags) |
| **AdminAcademicYear** | Create and manage academic years |
| **AdminAcademicYearDetail** | Attach sections to years, view enrolled students |
| **AdminSectionDetail** | Detailed section management (rename, remove students, view campaigns) |
| **AdminRecords** | Full audit log table — filter by role, category, and search |
| **AdminSettings** | Platform name, maintenance mode, system toggles |
| **AdminProfile** | Admin-specific profile with **dynamic calendar heatmap** |

### 🧠 AI Campaign Builder (`TeacherStoryBuilder.tsx`)
- [x] Gemini AI integration: generate story titles, narratives, vocabulary, and quiz questions
- [x] Multi-level story structure with configurable level count
- [x] Quiz types: Multiple Choice, True/False, Fill-in-the-Blank, Matching
- [x] Story Layout Builder: arrange text blocks, image slots, and decoration
- [x] Manual override of all AI-generated content
- [x] Publish/unpublish to specific sections

### 🏆 Gamification Engine
- [x] **XP System:** awarded per quiz answer and campaign completion
- [x] **Coin System:** earned per level, redeemable for rewards
- [x] **Streaks:** daily login tracking
- [x] **Stars:** 1–3 stars per level based on quiz accuracy
- [x] **Activity Heatmap:** dynamically renders the exact days of the current month; past days show activity intensity; future days are empty
- [x] **Leaderboards:** ranked by total XP within a class

### 📜 Certificates (`awardCertificate.ts`)
- [x] Auto-generated PDF on campaign completion
- [x] Includes: student name, campaign title, date, school logo (new official logo)
- [x] Downloadable from StudentAwards page

### 🔔 Notifications
- [x] Backend: Notification model with `read` status
- [x] Frontend: Bell icon in topbar, dropdown panel
- [x] Mark individual / mark all as read
- [x] Linked to section announcements and system events
- [x] **Admin: Notification bell hidden** (Admin has no notification use case yet)

### 💬 Chat
- [x] Shared `ChatView.tsx` component
- [x] Conversation & Message models in backend
- [x] Per-role chat pages (Teacher, Student, Admin stubs ready for future messaging feature)

### 📋 Audit Logging
- [x] Middleware auto-logs every significant action (login, publish, delete, etc.)
- [x] Fields: actor name, email, role, action, summary, target, IP, timestamp
- [x] Viewable in **AdminRecords** (full table) and **AdminUserDetail** (per-user feed)

---

## 🗓️ RECENT SESSION UPDATES (August 17, 2026)

| # | Change | File(s) |
|---|---|---|
| 1 | Replaced all logo references from `SRG.png` to official logo JPEG | `SignIn, SignUp, ForgotPassword, DashboardLayout, App.tsx, awardCertificate.ts` |
| 2 | CSS blend mode logic for logo transparency (light + dark + footer) | `index.css` |
| 3 | Replaced static 35-day heatmaps with calendar-accurate month grids | `TeacherProfile.tsx, AdminProfile.tsx, StudentProfile.tsx` |
| 4 | Added dynamic Activity Heatmap to StudentProfile | `StudentProfile.tsx` |
| 5 | Replaced placeholder "activity" in AdminUserDetail with real AuditLog feed | `AdminUserDetail.tsx` |
| 6 | Made AuditLog feed scrollable, removed technical `action` tags | `AdminUserDetail.tsx` |
| 7 | Redesigned footer links (removed Teacher Portal, Pricing, etc.) | `App.tsx` |
| 8 | Added clickable Info Modals for Resources & Legal links | `App.tsx` |
| 9 | Hid notification bell for Admin role | `DashboardLayout.tsx` |
| 10 | Fixed JSX parse errors in App.tsx and StudentStoryboard.tsx | `App.tsx, StudentStoryboard.tsx` |

---

## 🚀 GIT PUSH INSTRUCTIONS

To commit and push all changes to GitHub, run the following commands in your terminal:

```bash
# Stage all changes
git add .

# Write a clear commit message
git commit -m "feat: logo overhaul, gamified heatmaps, audit activity feeds, footer modals, and admin UI cleanup"

# Push to your main branch
git push origin main
```

> ⚠️ Make sure you are inside the project root folder (`STORY RACW`) when running these commands.

---

*Documented on August 17, 2026 — Story Race Game Development Team* 🎮
