
import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import ChatWithAI from "./pages/ChatWithAI";
import SchoolAdmin from "./pages/SchoolAdmin";
import AdminTeachers from "./pages/AdminTeachers";
import AdminTeacherManagement from "./pages/AdminTeacherManagement";
import AdminAnalytics from "./pages/AdminAnalytics";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import SchoolRegistration from "./pages/SchoolRegistration";
import TeacherInvitation from "./pages/TeacherInvitation";
import TestAccounts from "./pages/TestAccounts";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from './components/auth/ProtectedRoute';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/toaster"

// Add the import for TeacherStudents
import TeacherStudents from "./pages/TeacherStudents";

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light" storageKey="lovable-theme">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/features" element={<Features />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/school-registration" element={<SchoolRegistration />} />
              <Route path="/teacher/invitation" element={<TeacherInvitation />} />
              <Route path="/test-accounts" element={<TestAccounts />} />
              
              {/* Add the new route for teacher students management */}
              <Route path="/teacher/students" element={
                <ProtectedRoute requiredUserType="teacher">
                  <TeacherStudents />
                </ProtectedRoute>
              } />
              
              {/* Protected routes */}
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
              
              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute requiredUserType="school">
                  <SchoolAdmin />
                </ProtectedRoute>
              } />
              <Route path="/admin/teachers" element={
                <ProtectedRoute requiredUserType="school">
                  <AdminTeachers />
                </ProtectedRoute>
              } />
              <Route path="/admin/teachers/:id" element={
                <ProtectedRoute requiredUserType="school">
                  <AdminTeacherManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute requiredUserType="school">
                  <AdminAnalytics />
                </ProtectedRoute>
              } />
              
              {/* Teacher routes */}
              <Route path="/teacher/analytics" element={
                <ProtectedRoute requiredUserType="teacher">
                  <TeacherAnalytics />
                </ProtectedRoute>
              } />
              
              {/* Catch-all route for 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>

            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App;
