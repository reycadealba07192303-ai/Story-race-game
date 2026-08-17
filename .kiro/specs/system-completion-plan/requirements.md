# Requirements Document

## Introduction

Ang **Story Race Game** ay isang gamified reading platform para sa Grade 8 students. Ang system ay gumagamit ng React + TypeScript sa frontend, Node.js/Express sa backend, Firebase para sa authentication at database, at MongoDB para sa campaign/story data.

Ang layunin ng planong ito ay tapusin ang system sa pamamagitan ng:
1. Pagpapalit ng lahat ng dummy/mock data sa tunay na data mula sa Firebase at backend API
2. Pagkonekta ng authentication sa lahat ng pages
3. Pagdagdag ng mga nawawalang backend routes (users, sections, XP, leaderboard, chat, atbp.)
4. Pagtapos ng mga hindi pa tapos na features
5. Pagtanggal ng hardcoded na data

---

## Glossary

- **System**: Ang buong Story Race Game web application
- **Auth_Service**: Ang Firebase Authentication module na nag-aayos ng sign-in/sign-up
- **User_Store**: Ang Firebase Firestore collection na nag-iimbak ng user profiles, XP, at progress
- **Campaign_API**: Ang Node.js/Express backend REST API para sa campaigns/stories
- **Campaign**: Ang isang AI-generated multi-level gamified story
- **Student**: Isang gumagamit na may `role: "student"` sa User_Store
- **Teacher**: Isang gumagamit na may `role: "teacher"` sa User_Store
- **Admin**: Isang gumagamit na may `role: "admin"` sa User_Store
- **Section**: Isang klase/grupo ng mga estudyante (e.g., "Grade 8 - Section A")
- **XP**: Experience points na kinikita ng Student sa pag-complete ng levels at quizzes
- **Progress_Store**: Ang Firestore subcollection na nag-track ng per-student, per-campaign progress
- **Leaderboard_Service**: Ang backend o Firestore query na nag-compute ng class ranking batay sa XP
- **Chat_Service**: Ang Firestore-based real-time messaging feature
- **Notification_Service**: Ang Firestore-based notification system

---

## Requirements

### Requirement 1: Firebase Authentication Integration

**User Story:** As a user (student, teacher, or admin), I want to sign in and sign up using real Firebase Authentication, so that my account is secure and my session is properly managed across the application.

#### Acceptance Criteria

1. WHEN a user submits the sign-in form with valid email and password, THE Auth_Service SHALL authenticate the user via Firebase and redirect them to their role-specific dashboard (`/student`, `/teacher`, or `/admin`).
2. WHEN a user submits the sign-in form with invalid credentials, THE Auth_Service SHALL display a descriptive error message and keep the user on the sign-in page.
3. WHEN a user submits the sign-up form with valid data, THE Auth_Service SHALL create a Firebase Auth account and save a user profile document in the User_Store with fields: `uid`, `name`, `email`, `role`, `section`, `createdAt`.
4. WHEN a user is not authenticated and attempts to access any dashboard route (e.g., `/student`, `/teacher`, `/admin`), THE System SHALL redirect the user to `/signin`.
5. WHEN an authenticated user clicks Sign Out, THE Auth_Service SHALL call Firebase `signOut()` and redirect the user to `/signin`.
6. WHEN the application loads, THE Auth_Service SHALL check the current Firebase auth state and restore the session if a valid token exists.
7. WHEN a student registers, THE Auth_Service SHALL load the available sections from the User_Store and display them in the Section dropdown of the sign-up form.
8. IF a user attempts to access a route that does not match their role (e.g., a student accessing `/admin`), THEN THE System SHALL redirect them to their correct dashboard.

---

### Requirement 2: Real User Data in All Dashboard Pages

**User Story:** As a user, I want my dashboard to show my real name, role, XP, and section — not placeholder text — so that the system feels personal and accurate.

#### Acceptance Criteria

1. WHEN an authenticated user views any dashboard page, THE System SHALL display the user's actual name from User_Store in the sidebar and topbar (replacing "Ms. Teacher", "Student Name", "Admin User").
2. WHEN an authenticated student views StudentDashboard, THE System SHALL display the student's actual XP total, current level, reading streak, and stories progress from User_Store and Progress_Store.
3. WHEN an authenticated teacher views TeacherDashboard, THE System SHALL display the teacher's real name, actual student count from assigned sections, and real assignment/campaign data.
4. WHEN an authenticated admin views AdminDashboard, THE System SHALL display real platform statistics: total users count, total published campaigns count, total teachers count, from User_Store.
5. THE DashboardLayout SHALL accept and display the authenticated user's real `userName` and `role` from the Auth_Service context instead of hardcoded props.

---

### Requirement 3: Admin User Management with Real Data

**User Story:** As an admin, I want to view, search, and manage all real registered users from Firebase, so that I can oversee the platform.

#### Acceptance Criteria

1. WHEN an admin visits the Users page, THE System SHALL fetch and display all users from the User_Store ordered by creation date.
2. WHEN an admin filters users by role (Student, Teacher, Admin), THE System SHALL display only users matching the selected role.
3. WHEN an admin searches by name, THE System SHALL display users whose names contain the search text.
4. WHEN an admin clicks "View Profile" on a user, THE System SHALL navigate to the AdminUserDetail page and display that user's real Firestore data.
5. WHEN an admin views AdminUserDetail, THE System SHALL display the user's name, email, role, section, join date, XP, and reading activity.
6. WHEN an admin clicks "Export CSV", THE System SHALL download a CSV file containing all currently filtered user records.

---

### Requirement 4: Admin Academic Year and Section Management

**User Story:** As an admin, I want to create and manage academic years and sections in Firebase, so that teachers and students can be organized properly.

#### Acceptance Criteria

1. WHEN an admin adds a new section, THE System SHALL save the section to the User_Store with fields: `name`, `academicYear`, `createdAt`.
2. WHEN an admin removes a section, THE System SHALL delete the section from the User_Store.
3. WHEN an admin views academic years, THE System SHALL load and display all academic year records from the User_Store.
4. WHEN a new academic year is added, THE System SHALL save it to the User_Store.
5. WHEN the Sign-Up page loads for a student, THE System SHALL fetch available sections from the User_Store and populate the Section dropdown.

---

### Requirement 5: Teacher Class Management with Real Data

**User Story:** As a teacher, I want to see my actual assigned classes, students, and campaign assignments in Firestore, so that I can manage them effectively.

#### Acceptance Criteria

1. WHEN a teacher views TeacherClasses, THE System SHALL fetch and display only the sections assigned to that teacher from the User_Store.
2. WHEN a teacher views TeacherClassDetail, THE System SHALL display only the real students enrolled in that section from the User_Store.
3. WHEN a teacher posts an announcement in a section, THE System SHALL save the announcement to the User_Store under that section's subcollection.
4. WHEN a teacher generates a new join code, THE System SHALL save the join code to the User_Store and associate it with that section.
5. WHEN a teacher views TeacherDashboard, THE System SHALL display real statistics from the User_Store: actual student count, average XP score across assigned sections, and real campaign assignment data.

---

### Requirement 6: Campaign Assignment to Sections

**User Story:** As a teacher, I want published campaigns to be visible only to students in the targeted section, so that the right content reaches the right students.

#### Acceptance Criteria

1. WHEN a teacher creates and publishes a campaign with a target section, THE Campaign_API SHALL store the `targetSection` field on the campaign document.
2. WHEN a student views StudentStoryboard, THE Campaign_API SHALL return only campaigns where `published: true` AND `targetSection` matches the student's section OR `targetSection` equals "All Sections".
3. WHEN a student completes a campaign level and quiz, THE Progress_Store SHALL record the result with fields: `studentId`, `campaignId`, `levelNumber`, `stars`, `coins`, `completedAt`.
4. WHEN a student reopens a campaign they have already started, THE System SHALL load their existing progress from Progress_Store and restore completed levels and earned stars.
5. THE Progress_Store SHALL persist student progress between sessions so it is not lost on page reload.

---

### Requirement 7: Real XP and Leaderboard System

**User Story:** As a student, I want my XP to be saved and my rank on the leaderboard to be real and up to date, so that I can track my progress and compete with classmates.

#### Acceptance Criteria

1. WHEN a student completes a quiz level and earns coins/stars, THE System SHALL update the student's total XP in the User_Store by adding the earned coins as XP.
2. WHEN a student views StudentLeaderboard, THE System SHALL fetch all students in the same section from User_Store, sorted by total XP descending, and display their real names, XP, and levels.
3. WHEN a student views StudentDashboard, THE System SHALL show their real rank position within their class section.
4. THE Leaderboard_Service SHALL compute a student's "Level" based on their total XP using a defined XP-per-level progression (e.g., 100 XP per level).
5. WHEN a student views their StudentProfile, THE System SHALL display their real total XP, reading streak, and class rank from User_Store.

---

### Requirement 8: Real Awards and Certificates System

**User Story:** As a student, I want to earn real awards and downloadable certificates based on my actual achievements, so that my accomplishments are recognized.

#### Acceptance Criteria

1. WHEN a student completes their first campaign, THE System SHALL automatically award the "Bookworm Badge" and save it to the User_Store under that student's awards subcollection.
2. WHEN a student maintains a reading streak of 5 or more consecutive days, THE System SHALL automatically award the "Fire Streak" badge.
3. WHEN a student ranks in the top 5 of their class leaderboard, THE System SHALL automatically award the "Top 5 Elite" badge.
4. WHEN a student views StudentAwards, THE System SHALL display only awards that have been actually earned, loaded from User_Store.
5. WHEN a student clicks "Download" on a certificate, THE System SHALL generate and download a PDF certificate with the student's real name, score, and date.
6. THE System SHALL check award conditions after each quiz completion and leaderboard recalculation and trigger the award if conditions are met.

---

### Requirement 9: Real-Time Chat System

**User Story:** As a user (admin, teacher, or student), I want to send and receive real-time chat messages within the platform using Firebase, so that communication is live and not simulated.

#### Acceptance Criteria

1. WHEN a user opens the Chat page, THE Chat_Service SHALL load the list of real conversations from Firestore for that user.
2. WHEN a user sends a message, THE Chat_Service SHALL save the message to Firestore and display it immediately in the chat window.
3. WHEN another user sends a message in an open conversation, THE Chat_Service SHALL display the new message in real time using Firestore's `onSnapshot` listener without page reload.
4. WHEN a user has unread messages, THE Chat_Service SHALL display an unread count badge on the Chat nav item and in the conversation list.
5. WHEN a user searches in the chat contact list, THE System SHALL filter contacts by name in real time.

---

### Requirement 10: Real-Time Notifications System

**User Story:** As a user, I want to receive real notifications from the platform (e.g., new story published, quiz results, rank changes), so that I stay informed of important events.

#### Acceptance Criteria

1. WHEN a new campaign is published by a teacher, THE Notification_Service SHALL create a notification document in Firestore for each student in the targeted section.
2. WHEN a student completes a quiz, THE Notification_Service SHALL create a notification for the teacher with the result.
3. WHEN a user opens the notification bell, THE System SHALL load and display real notifications from Firestore for that user.
4. WHEN a user has unread notifications, THE System SHALL display a red badge count on the notification bell in the topbar.
5. WHEN a user clicks "Mark all read", THE Notification_Service SHALL update all notification documents for that user in Firestore to `read: true`.
6. WHEN a user clicks "View all notifications", THE System SHALL navigate to the NotificationsPage and display the full list of real notifications from Firestore.

---

### Requirement 11: Teacher Story Builder — Section Dropdown from Real Data

**User Story:** As a teacher, I want the Target Section dropdown in the Story Builder to show real sections from the system, not hardcoded options.

#### Acceptance Criteria

1. WHEN a teacher opens the Story Builder (TeacherStoryBuilder), THE System SHALL fetch available sections from the User_Store and populate the Target Section dropdown.
2. WHEN no sections exist, THE System SHALL display a message "No sections available. Ask your admin to create sections."
3. WHEN a teacher selects "All Sections", THE Campaign_API SHALL store `targetSection: "All Sections"` on the campaign and make it visible to all students regardless of section.

---

### Requirement 12: Student Story Progress Persistence

**User Story:** As a student, I want my story progress (coins, stars, completed levels) to be saved to the database so it is not lost when I close the browser.

#### Acceptance Criteria

1. WHEN a student completes a quiz level, THE Progress_Store SHALL immediately persist the result (stars, coins, completedAt) to Firestore.
2. WHEN a student returns to a campaign they previously started, THE System SHALL load saved progress from Progress_Store and restore all completed levels and earned stars on the level map.
3. WHEN a student earns coins from a quiz, THE System SHALL update the student's total coin count in User_Store.
4. THE System SHALL NOT reset progress on page reload or navigation.

---

### Requirement 13: Admin Records Page with Real Data

**User Story:** As an admin, I want the Records page to display real platform-wide activity data from Firebase, so that I can monitor system usage.

#### Acceptance Criteria

1. WHEN an admin views the Records page, THE System SHALL display a real list of all completed quiz attempts from Progress_Store.
2. WHEN an admin applies a filter on the Records page, THE System SHALL re-query Firestore with the selected filter and update the displayed records.
3. THE System SHALL display each record with: student name, campaign title, level number, score, stars, and completion date.

---

### Requirement 14: Remove All Dummy/Hardcoded Data

**User Story:** As a developer, I want all placeholder and dummy data removed from components and replaced with real data fetching logic, so that the system is production-ready.

#### Acceptance Criteria

1. THE StudentDashboard SHALL remove the hardcoded `STATS`, `STORIES`, and `LEADERBOARD` arrays and replace them with real data from User_Store and Progress_Store.
2. THE TeacherDashboard SHALL remove the hardcoded `STATS`, `STUDENTS`, and `ASSIGNMENTS` arrays and replace them with real Firestore data.
3. THE AdminDashboard SHALL remove the hardcoded `STATS`, `USERS`, and `OVERVIEW` arrays and replace them with real Firestore aggregation data.
4. THE AdminUsers page SHALL remove the hardcoded `USERS` array and load users from User_Store.
5. THE TeacherClasses page SHALL remove the hardcoded `SECTIONS` array and load sections from User_Store.
6. THE TeacherClassDetail page SHALL remove the hardcoded `students` state and load real students from User_Store.
7. THE StudentLeaderboard SHALL remove the hardcoded `LEADERBOARD_DATA` array and load real student XP rankings from User_Store.
8. THE StudentAwards page SHALL remove the hardcoded `AWARDS` and `CERTIFICATES` arrays and load real earned awards from User_Store.
9. THE StudentProfile page SHALL remove hardcoded form values and load the authenticated student's real data from User_Store.
10. THE DashboardLayout SHALL remove the hardcoded `NOTIFS_BY_ROLE` object and load real notifications from Firestore.
11. THE Chat pages (AdminChat, TeacherChat, StudentChat) SHALL remove the hardcoded `CONTACTS` and `messages` arrays and replace with real Firestore data.
