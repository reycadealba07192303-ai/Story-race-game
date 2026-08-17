import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import SignIn from './pages/SignIn.tsx'
import SignUp from './pages/SignUp.tsx'
import ForgotPassword from './pages/ForgotPassword.tsx'
import NotificationsPage from './pages/NotificationsPage.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import { DialogProvider } from './components/DialogProvider.tsx'

import AdminDashboard, { ADMIN_NAV } from './pages/admin/AdminDashboard.tsx'
import AdminAcademicYear from './pages/admin/AdminAcademicYear.tsx'
import AdminAcademicYearDetail from './pages/admin/AdminAcademicYearDetail.tsx'
import AdminUsers from './pages/admin/AdminUsers.tsx'
import AdminUserDetail from './pages/admin/AdminUserDetail.tsx'
import AdminRecords from './pages/admin/AdminRecords.tsx'
import AdminSettings from './pages/admin/AdminSettings.tsx'
import AdminProfile from './pages/admin/AdminProfile.tsx'
import AdminChat from './pages/admin/AdminChat.tsx'
import AdminSectionDetail from './pages/admin/AdminSectionDetail.tsx'

import TeacherDashboard from './pages/teacher/TeacherDashboard.tsx'
import TeacherProfile from './pages/teacher/TeacherProfile.tsx'
import TeacherClasses, { TEACHER_NAV } from './pages/teacher/TeacherClasses.tsx'
import TeacherClassDetail from './pages/teacher/TeacherClassDetail.tsx'
import TeacherChat from './pages/teacher/TeacherChat.tsx'
import TeacherStoryDashboard from './pages/teacher/TeacherStoryDashboard.tsx'
import TeacherStoryOverview from './pages/teacher/TeacherStoryOverview.tsx'
import TeacherStoryBuilder from './pages/teacher/TeacherStoryBuilder.tsx'
import StudentDashboard, { STUDENT_NAV } from './pages/student/StudentDashboard.tsx'
import StudentProfile from './pages/student/StudentProfile.tsx'
import StudentLeaderboard from './pages/student/StudentLeaderboard.tsx'
import StudentStoryboard from './pages/student/StudentStoryboard.tsx'
import StudentStoryReader from './pages/student/StudentStoryReader.tsx'
import StudentChat from './pages/student/StudentChat.tsx'
import StudentSection from './pages/student/StudentSection.tsx'
import StudentAwards from './pages/student/StudentAwards.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DialogProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/academic-year" element={<ProtectedRoute roles={['admin']}><AdminAcademicYear /></ProtectedRoute>} />
          <Route path="/admin/academic-year/:yearId" element={<ProtectedRoute roles={['admin']}><AdminAcademicYearDetail /></ProtectedRoute>} />
          <Route path="/admin/sections/:sectionId" element={<ProtectedRoute roles={['admin']}><AdminSectionDetail /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/users/:userId" element={<ProtectedRoute roles={['admin']}><AdminUserDetail /></ProtectedRoute>} />
          <Route path="/admin/chat" element={<ProtectedRoute roles={['admin']}><AdminChat /></ProtectedRoute>} />
          <Route path="/admin/records" element={<ProtectedRoute roles={['admin']}><AdminRecords /></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute roles={['admin']}><NotificationsPage navItems={ADMIN_NAV} role="admin" userName="Admin User" sectionLabel="Administration" /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute roles={['admin']}><AdminProfile /></ProtectedRoute>} />

          {/* Teacher */}
          <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/teacher/classes" element={<ProtectedRoute roles={['teacher']}><TeacherClasses /></ProtectedRoute>} />
          <Route path="/teacher/classes/:sectionId" element={<ProtectedRoute roles={['teacher']}><TeacherClassDetail /></ProtectedRoute>} />
          <Route path="/teacher/chat" element={<ProtectedRoute roles={['teacher']}><TeacherChat /></ProtectedRoute>} />
          <Route path="/teacher/stories" element={<ProtectedRoute roles={['teacher']}><TeacherStoryDashboard /></ProtectedRoute>} />
          <Route path="/teacher/stories/:id" element={<ProtectedRoute roles={['teacher']}><TeacherStoryOverview /></ProtectedRoute>} />
          <Route path="/teacher/stories/build" element={<ProtectedRoute roles={['teacher']}><TeacherStoryBuilder /></ProtectedRoute>} />
          <Route path="/teacher/notifications" element={<ProtectedRoute roles={['teacher']}><NotificationsPage navItems={TEACHER_NAV} role="teacher" userName="Ms. Teacher" sectionLabel="Classroom" /></ProtectedRoute>} />
          <Route path="/teacher/profile" element={<ProtectedRoute roles={['teacher']}><TeacherProfile /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/section" element={<ProtectedRoute roles={['student']}><StudentSection /></ProtectedRoute>} />
          <Route path="/student/stories" element={<ProtectedRoute roles={['student']}><StudentStoryboard /></ProtectedRoute>} />
          <Route path="/student/stories/play/:storyId/:levelId" element={<ProtectedRoute roles={['student']}><StudentStoryReader /></ProtectedRoute>} />
          <Route path="/student/leaderboard" element={<ProtectedRoute roles={['student']}><StudentLeaderboard /></ProtectedRoute>} />
          <Route path="/student/awards" element={<ProtectedRoute roles={['student']}><StudentAwards /></ProtectedRoute>} />
          <Route path="/student/chat" element={<ProtectedRoute roles={['student']}><StudentChat /></ProtectedRoute>} />
          <Route path="/student/notifications" element={<ProtectedRoute roles={['student']}><NotificationsPage navItems={STUDENT_NAV} role="student" userName="Student Name" sectionLabel="Learning" /></ProtectedRoute>} />
          <Route path="/student/profile" element={<ProtectedRoute roles={['student']}><StudentProfile /></ProtectedRoute>} />
        </Routes>
        </DialogProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
