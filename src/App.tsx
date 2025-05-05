
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

import AuthErrorHandler from './components/auth/AuthErrorHandler';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import SchoolRegistration from './pages/SchoolRegistration';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import TeacherInvitation from './pages/TeacherInvitation';
import SchoolAdmin from './pages/SchoolAdmin';
import SchoolSettings from './pages/SchoolSettings';
import TeacherStudents from './pages/TeacherStudents';
import TeacherAnalytics from './pages/TeacherAnalytics';
import AdminAnalytics from './pages/AdminAnalytics';
import Pricing from './pages/Pricing';
import Features from './pages/Features';
import Contact from './pages/Contact';
import About from './pages/About';
import PrivacyPolicy from './pages/PrivacyPolicy';
import StudentSettings from './pages/StudentSettings';
import StudentProgress from './pages/StudentProgress';
import StudentAssessments from './pages/StudentAssessments';
import AdminTeachers from './pages/AdminTeachers';
import AdminStudents from './pages/AdminStudents';
import AdminTeacherManagement from './pages/AdminTeacherManagement';
import AdminTools from './pages/AdminTools';
import TestAccounts from './pages/TestAccounts';
import ChatPage from './pages/ChatPage';
import Documents from './pages/Documents';
import ChatWithAI from './pages/ChatWithAI';
import AISettings from './pages/AISettings';

import './App.css';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <AuthErrorHandler>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/school-registration" element={<SchoolRegistration />} />
                <Route path="/teacher-invitation/:inviteId" element={<TeacherInvitation />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/features" element={<Features />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                
                {/* School Admin routes */}
                <Route path="/admin" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><SchoolAdmin /></ProtectedRoute>} />
                <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminTeachers /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><SchoolSettings /></ProtectedRoute>} />
                <Route path="/admin/students" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminStudents /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminAnalytics /></ProtectedRoute>} />
                <Route path="/admin/tools" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminTools /></ProtectedRoute>} />
                <Route path="/admin/teacher-management" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminTeacherManagement /></ProtectedRoute>} />
                
                {/* Legacy school admin routes (redirects to new structure) */}
                <Route path="/school-admin" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><SchoolAdmin /></ProtectedRoute>} />
                <Route path="/school-settings" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><SchoolSettings /></ProtectedRoute>} />
                <Route path="/admin-teachers" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminTeachers /></ProtectedRoute>} />
                <Route path="/admin-students" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminStudents /></ProtectedRoute>} />
                <Route path="/admin-analytics" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminAnalytics /></ProtectedRoute>} />
                <Route path="/admin-teacher-management" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminTeacherManagement /></ProtectedRoute>} />
                <Route path="/admin-tools" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><AdminTools /></ProtectedRoute>} />
                <Route path="/test-accounts" element={<ProtectedRoute allowedRoles={["school_admin", "school"]}><TestAccounts /></ProtectedRoute>} />
                
                {/* Teacher routes */}
                <Route path="/teacher-students" element={<ProtectedRoute requiredRole="teacher"><TeacherStudents /></ProtectedRoute>} />
                <Route path="/teacher-analytics" element={<ProtectedRoute requiredRole="teacher"><TeacherAnalytics /></ProtectedRoute>} />
                
                {/* Student routes */}
                <Route path="/student-settings" element={<ProtectedRoute requiredRole="student"><StudentSettings /></ProtectedRoute>} />
                <Route path="/student-progress" element={<ProtectedRoute requiredRole="student"><StudentProgress /></ProtectedRoute>} />
                <Route path="/student-assessments" element={<ProtectedRoute requiredRole="student"><StudentAssessments /></ProtectedRoute>} />
                
                {/* Shared routes */}
                <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                <Route path="/chat-with-ai" element={<ProtectedRoute><ChatWithAI /></ProtectedRoute>} />
                <Route path="/ai-settings" element={<ProtectedRoute><AISettings /></ProtectedRoute>} />

                {/* Not found route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthErrorHandler>
            <Toaster position="top-right" />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
