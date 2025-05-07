
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import SchoolRegistration from '@/pages/SchoolRegistration';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import SchoolAdmin from '@/pages/SchoolAdmin';
import AdminTeachers from '@/pages/AdminTeachers';
import AdminStudents from '@/pages/AdminStudents';
import TeacherAnalytics from '@/pages/TeacherAnalytics';
import TeacherStudents from '@/pages/TeacherStudents';
import StudentAssessments from '@/pages/StudentAssessments';
import StudentProgress from '@/pages/StudentProgress';
import ChatWithAI from '@/pages/ChatWithAI';
import Documents from '@/pages/Documents';
import NotFound from '@/pages/NotFound';
import Features from '@/pages/Features';
import Pricing from '@/pages/Pricing';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import TestAccounts from '@/pages/TestAccounts';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TeacherInvitation from '@/pages/TeacherInvitation';
import ForgotPasswordPage from '@/pages/ForgotPassword';
import ResetPasswordPage from '@/pages/ResetPassword';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Toaster } from 'sonner';
import AuthCallback from '@/components/auth/AuthCallback';
import AdminTeacherManagement from '@/pages/AdminTeacherManagement';

// Wrap with ProtectedRoute for pages that require authentication
const AppRoutes = () => {
  return (
    <>
      <Toaster position="top-right" closeButton={true} />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/school-registration" element={<SchoolRegistration />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/test-accounts" element={<TestAccounts />} />
        
        {/* Authentication routes */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invitation/:token" element={<TeacherInvitation />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
        />
        
        {/* School admin routes */}
        <Route 
          path="/admin" 
          element={<ProtectedRoute roles={["school_admin"]}><SchoolAdmin /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/teachers" 
          element={<ProtectedRoute roles={["school_admin"]}><AdminTeachers /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/teacher-management" 
          element={<ProtectedRoute roles={["school_admin"]}><AdminTeacherManagement /></ProtectedRoute>} 
        />
        <Route 
          path="/admin/students" 
          element={<ProtectedRoute roles={["school_admin"]}><AdminStudents /></ProtectedRoute>} 
        />
        
        {/* Teacher routes */}
        <Route 
          path="/teacher/analytics" 
          element={<ProtectedRoute roles={["teacher", "teacher_supervisor"]}><TeacherAnalytics /></ProtectedRoute>} 
        />
        <Route 
          path="/teacher/students" 
          element={<ProtectedRoute roles={["teacher", "teacher_supervisor"]}><TeacherStudents /></ProtectedRoute>} 
        />
        
        {/* Student routes */}
        <Route 
          path="/student/assessments" 
          element={<ProtectedRoute roles={["student"]}><StudentAssessments /></ProtectedRoute>} 
        />
        <Route 
          path="/student/progress" 
          element={<ProtectedRoute roles={["student"]}><StudentProgress /></ProtectedRoute>} 
        />
        
        {/* Common authenticated routes */}
        <Route 
          path="/chat" 
          element={<ProtectedRoute><ChatWithAI /></ProtectedRoute>} 
        />
        <Route 
          path="/documents" 
          element={<ProtectedRoute><Documents /></ProtectedRoute>} 
        />
        
        {/* Not found page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
