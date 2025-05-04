
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner";

// Import components and pages
import Index from "@/pages/Index";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Features from "@/pages/Features";
import Pricing from "@/pages/Pricing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import ChatWithAI from "@/pages/ChatWithAI";
import ChatPage from "@/pages/ChatPage";
import Documents from "@/pages/Documents";
import AdminTeachers from "@/pages/AdminTeachers";
import AdminStudents from "@/pages/AdminStudents";
import SchoolSettings from "@/pages/SchoolSettings";
import SchoolRegistration from "@/pages/SchoolRegistration";
import TestAccounts from "@/pages/TestAccounts";
import TeacherInvitation from "@/pages/TeacherInvitation";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import SchoolAdmin from "@/pages/SchoolAdmin";
import AdminAnalytics from "@/pages/AdminAnalytics";
import TeacherStudents from "@/pages/TeacherStudents";
import TeacherAnalytics from "@/pages/TeacherAnalytics";
import StudentProgress from "@/pages/StudentProgress";
import StudentAssessments from "@/pages/StudentAssessments";
import StudentSettings from "@/pages/StudentSettings";
import AdminTools from "@/pages/AdminTools";
import AdminTeacherManagement from "@/pages/AdminTeacherManagement";
import Unauthorized from "@/pages/Unauthorized";

// Define demo mode status
const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

function App() {
  const [demoUserType, setDemoUserType] = useState<string | null>(null);

  useEffect(() => {
    // Check if the app is running in demo mode
    if (isDemoMode) {
      // Retrieve the user type from local storage
      const userType = localStorage.getItem("demoUserType");
      setDemoUserType(userType);
    }
  }, []);

  // Demo notice component
  const DemoNotice = ({ userType }: { userType: string | null }) => (
    <div className="fixed top-0 left-0 w-full bg-yellow-500 text-yellow-900 p-2 text-center z-50">
      This is a demo. You are logged in as a {userType}.
    </div>
  );

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          {isDemoMode && <DemoNotice userType={demoUserType} />}
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/school-registration" element={<SchoolRegistration />} />
            <Route path="/test-accounts" element={<TestAccounts />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<ChatWithAI />} />
              <Route path="/chat-v2" element={<ChatPage />} />
              <Route path="/documents" element={<Documents />} />
              
              {/* Admin routes */}
              <Route path="/admin/teachers" element={
                <ProtectedRoute requiredRole="school">
                  <AdminTeachers />
                </ProtectedRoute>
              } />
              <Route path="/admin/students" element={
                <ProtectedRoute requiredRole="school">
                  <AdminStudents />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute requiredRole="school">
                  <SchoolSettings />
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute requiredRole="school">
                  <AdminAnalytics />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="school">
                  <SchoolAdmin />
                </ProtectedRoute>
              } />
              <Route path="/admin/tools" element={
                <ProtectedRoute requiredRole="school">
                  <AdminTools />
                </ProtectedRoute>
              } />
              <Route path="/admin/teacher-management" element={
                <ProtectedRoute requiredRole="school">
                  <AdminTeacherManagement />
                </ProtectedRoute>
              } />

              {/* Teacher routes */}
              <Route path="/teacher/students" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherStudents />
                </ProtectedRoute>
              } />
              <Route path="/teacher/analytics" element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherAnalytics />
                </ProtectedRoute>
              } />

              {/* Student routes */}
              <Route path="/student/progress" element={
                <ProtectedRoute requiredRole="student">
                  <StudentProgress />
                </ProtectedRoute>
              } />
              <Route path="/student/assessments" element={
                <ProtectedRoute requiredRole="student">
                  <StudentAssessments />
                </ProtectedRoute>
              } />
              <Route path="/student/settings" element={
                <ProtectedRoute requiredRole="student">
                  <StudentSettings />
                </ProtectedRoute>
              } />
            </Route>

            {/* Special invite route */}
            <Route path="/invite/teacher/:token" element={<TeacherInvitation />} />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
