import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StrictMode } from "react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import SchoolAdmin from "./pages/SchoolAdmin";
import TeacherInvitation from "./pages/TeacherInvitation";
import AdminTeachers from "./pages/AdminTeachers";
import TeacherStudents from "./pages/TeacherStudents";
import TestAccounts from "./pages/TestAccounts";
import AdminAnalytics from "./pages/AdminAnalytics";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import ChatWithAI from "./pages/ChatWithAI";
import Features from "./pages/Features";
import PricingPage from "./pages/Pricing";
import AboutPage from "./pages/About";
import ContactPage from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/invitation" element={<TeacherInvitation />} />
              <Route path="/test-accounts" element={<TestAccounts />} />
              
              {/* Public informational pages */}
              <Route path="/features" element={<Features />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* Basic protected route - just requires authentication */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* Chat with AI route - accessible to all logged in users */}
              <Route path="/chat" element={
                <ProtectedRoute>
                  <ChatWithAI />
                </ProtectedRoute>
              } />

              {/* School admin dashboard - requires supervisor role */}
              <Route path="/school-admin" element={
                <ProtectedRoute allowedRoles={['school']} requireSupervisor={true}>
                  <SchoolAdmin />
                </ProtectedRoute>
              } />
              
              {/* Protected routes with role-based access control */}
              <Route path="/school-admin/teachers" element={
                <ProtectedRoute allowedRoles={['school']} requireSupervisor={true}>
                  <SchoolAdmin />
                </ProtectedRoute>
              } />
              
              {/* New Admin Teachers page */}
              <Route path="/admin/teachers" element={
                <ProtectedRoute allowedRoles={['school']} requireSupervisor={true}>
                  <AdminTeachers />
                </ProtectedRoute>
              } />

              {/* New Teacher Students page */}
              <Route path="/teacher/students" element={
                <ProtectedRoute allowedRoles={['school', 'teacher']}>
                  <TeacherStudents />
                </ProtectedRoute>
              } />
              
              {/* New Analytics pages */}
              <Route path="/admin/analytics" element={
                <ProtectedRoute allowedRoles={['school']} requireSupervisor={true}>
                  <AdminAnalytics />
                </ProtectedRoute>
              } />
              
              <Route path="/teacher/analytics" element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherAnalytics />
                </ProtectedRoute>
              } />
              
              <Route path="/teachers" element={
                <ProtectedRoute allowedRoles={['school', 'teacher']}>
                  <div>Teachers Dashboard</div>
                </ProtectedRoute>
              } />
              
              <Route path="/students" element={
                <ProtectedRoute allowedRoles={['school', 'teacher', 'student']}>
                  <div>Students Dashboard</div>
                </ProtectedRoute>
              } />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
);

export default App;
