import React from "react";
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

const App = () => (
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

    {/* School admin routes */}
    <Route path="/admin" element={
      <ProtectedRoute requiredUserType="school">
        <SchoolAdmin />
      </ProtectedRoute>
    } />
    <Route path="/admin/teacher-management" element={
      <ProtectedRoute requiredUserType="school">
        <AdminTeacherManagement />
      </ProtectedRoute>
    } />
    <Route path="/admin/teachers" element={
      <ProtectedRoute requiredUserType="school">
        <AdminTeachers />
      </ProtectedRoute>
    } />
    <Route path="/admin/analytics" element={
      <ProtectedRoute requiredUserType="school">
        <AdminAnalytics />
      </ProtectedRoute>
    } />
    <Route path="/admin/students" element={
      <ProtectedRoute requiredUserType="school">
        <AdminStudents />
      </ProtectedRoute>
    } />
    <Route path="/admin/settings" element={
      <ProtectedRoute requiredUserType="school">
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

    {/* 404 route */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
