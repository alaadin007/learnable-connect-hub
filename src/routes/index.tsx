import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { RBACProvider } from '@/contexts/RBACContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Public pages
import Home from '@/pages/Home';
import About from '@/pages/About';
import Features from '@/pages/Features';
import Contact from '@/pages/Contact';
import Pricing from '@/pages/Pricing';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import SchoolRegistration from '@/pages/SchoolRegistration';
import TeacherInvitation from '@/pages/TeacherInvitation';
import TestAccounts from '@/pages/TestAccounts';
import AuthCallback from '@/components/auth/AuthCallback';
import NotFound from '@/pages/NotFound';

// Protected pages
import Dashboard from '@/pages/Dashboard';
import ChatWithAI from '@/pages/ChatWithAI';
import Documents from '@/pages/Documents';

// Admin pages
import SchoolAdmin from '@/pages/SchoolAdmin';
import AdminTeacherManagement from '@/pages/AdminTeacherManagement';
import AdminTeachers from '@/pages/AdminTeachers';
import AdminAnalytics from '@/pages/AdminAnalytics';
import AdminStudents from '@/pages/AdminStudents';
import SchoolSettings from '@/pages/SchoolSettings';

// Teacher pages
import TeacherStudents from '@/pages/TeacherStudents';
import TeacherAnalytics from '@/pages/TeacherAnalytics';

// Student pages
import StudentAssessments from '@/pages/StudentAssessments';
import StudentProgress from '@/pages/StudentProgress';
import StudentSettings from '@/pages/StudentSettings';

function AppRoutes() {
  return (
    <RBACProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/school-registration" element={<SchoolRegistration />} />
        <Route path="/invitation/:token" element={<TeacherInvitation />} />
        <Route path="/test-accounts" element={<TestAccounts />} />

        {/* Protected routes - all user types */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatWithAI />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />

        {/* School admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['school_admin']}>
              <SchoolAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/teacher-management"
          element={
            <ProtectedRoute allowedRoles={['school_admin']}>
              <AdminTeacherManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute allowedRoles={['school_admin']}>
              <AdminTeachers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={['school_admin']}>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/students"
          element={
            <ProtectedRoute allowedRoles={['school_admin']}>
              <AdminStudents />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['school_admin']}>
              <SchoolSettings />
            </ProtectedRoute>
          }
        />

        {/* Teacher routes */}
        <Route
          path="/teacher/students"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'teacher_supervisor', 'school_admin']}>
              <TeacherStudents />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/analytics"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'teacher_supervisor', 'school_admin']}>
              <TeacherAnalytics />
            </ProtectedRoute>
          }
        />

        {/* Student routes */}
        <Route
          path="/student/assessments"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentAssessments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/progress"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentProgress />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/settings"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentSettings />
            </ProtectedRoute>
          }
        />

        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </RBACProvider>
  );
}

export default AppRoutes; 