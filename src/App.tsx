
import React from "react";
import {
  Route,
  Routes,
  Navigate
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminTools from "./pages/AdminTools";
import SchoolRegistration from "./pages/SchoolRegistration";
import Pricing from "./pages/Pricing";
import TestAccounts from "./pages/TestAccounts";
import SchoolAdmin from "./pages/SchoolAdmin";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import SchoolSettings from "./pages/SchoolSettings";
import AdminTeacherManagement from "./pages/AdminTeacherManagement";
import AdminTeachers from "./pages/AdminTeachers";
import ChatWithAI from "./pages/ChatWithAI";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/school-registration" element={<SchoolRegistration />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/test-accounts" element={<TestAccounts />} />
        
        {/* Add a direct route to redirect school admins */}
        <Route 
          path="/admin-redirect" 
          element={
            <ProtectedRoute requiredRole="school">
              <Navigate to="/admin" replace />
            </ProtectedRoute>
          } 
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Chat route */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatWithAI />
            </ProtectedRoute>
          }
        />
        
        {/* School Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="school">
              <SchoolAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredRole="school">
              <SchoolSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teacher-management"
          element={
            <ProtectedRoute requiredRole="school">
              <AdminTeacherManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute requiredRole="school">
              <AdminTeachers />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/admin/tools" 
          element={
            <ProtectedRoute requiredRole="school">
              <AdminTools />
            </ProtectedRoute>
          } 
        />
        
        {/* Teacher Routes */}
        <Route
          path="/teacher/analytics"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherAnalytics />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route for 404 errors */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
