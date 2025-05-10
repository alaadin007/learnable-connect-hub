
import { Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Features from "@/pages/Features";
import Contact from "@/pages/Contact";
import SchoolRegistration from "@/pages/SchoolRegistration";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import SchoolAdmin from "@/pages/SchoolAdmin";
import AdminTeacherManagement from "@/pages/AdminTeacherManagement";
import AdminTeachers from "@/pages/AdminTeachers";
import AdminAnalytics from "@/pages/AdminAnalytics";
import TeacherStudents from "@/pages/TeacherStudents";
import TeacherAnalytics from "@/pages/TeacherAnalytics";
import ChatWithAI from "@/pages/ChatWithAI";
import Documents from "@/pages/Documents";
import TeacherInvitation from "@/pages/TeacherInvitation";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import NotFound from "@/pages/NotFound";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Pricing from "@/pages/Pricing";
import Index from "@/pages/Index";
import TestAccounts from "@/pages/TestAccounts";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import StudentAssessments from "@/pages/StudentAssessments";
import StudentProgress from "@/pages/StudentProgress";
import StudentSettings from "@/pages/StudentSettings";
import AdminStudents from "@/pages/AdminStudents";
import SchoolSettings from "@/pages/SchoolSettings";
import StudentLectures from "@/pages/StudentLectures";
import StudentLectureView from "@/pages/StudentLectureView";

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/school-registration" element={<SchoolRegistration />} />
          <Route path="/invitation/:token" element={<TeacherInvitation />} />
          <Route path="/test-accounts" element={<TestAccounts />} />

          {/* Protected routes - all user types */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/chat" element={
            <ProtectedRoute>
              <ChatWithAI />
            </ProtectedRoute>
          } />
          
          <Route path="/documents" element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          } />

          {/* School admin routes - Note: Using allowedRoles instead of requiredUserType to be more flexible */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={["school", "school_admin"]}>
              <SchoolAdmin />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/teacher-management" element={
            <ProtectedRoute allowedRoles={["school", "school_admin"]}>
              <AdminTeacherManagement />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/teachers" element={
            <ProtectedRoute allowedRoles={["school", "school_admin"]}>
              <AdminTeachers />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/analytics" element={
            <ProtectedRoute allowedRoles={["school", "school_admin"]}>
              <AdminAnalytics />
            </ProtectedRoute>
          } />

          <Route path="/admin/students" element={
            <ProtectedRoute allowedRoles={["school", "school_admin"]}>
              <AdminStudents />
            </ProtectedRoute>
          } />

          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={["school", "school_admin"]}>
              <SchoolSettings />
            </ProtectedRoute>
          } />

          {/* Teacher routes */}
          <Route path="/teacher/students" element={
            <ProtectedRoute requiredUserType="teacher">
              <TeacherStudents />
            </ProtectedRoute>
          } />
          
          <Route path="/teacher/analytics" element={
            <ProtectedRoute requiredUserType="teacher">
              <TeacherAnalytics />
            </ProtectedRoute>
          } />
          
          {/* Student routes */}
          <Route path="/student/assessments" element={
            <ProtectedRoute requiredUserType="student">
              <StudentAssessments />
            </ProtectedRoute>
          } />
          
          <Route path="/student/progress" element={
            <ProtectedRoute requiredUserType="student">
              <StudentProgress />
            </ProtectedRoute>
          } />
          
          <Route path="/student/settings" element={
            <ProtectedRoute requiredUserType="student">
              <StudentSettings />
            </ProtectedRoute>
          } />
          
          <Route path="/student/lectures" element={
            <ProtectedRoute requiredUserType="student">
              <StudentLectures />
            </ProtectedRoute>
          } />

          <Route path="/student/lecture/:id" element={
            <ProtectedRoute requiredUserType="student">
              <StudentLectureView />
            </ProtectedRoute>
          } />

          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
