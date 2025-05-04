
import React from "react";
import {
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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

function AppRoutes() {
  const { userRole, isLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Only redirect if we're not in the middle of loading
    if (!isLoading && userRole) {
      console.log(`AppRoutes: Redirecting based on user role: ${userRole}`);
      
      // Redirect based on user role after login
      switch (userRole) {
        case "school":
          navigate("/admin", { state: { fromRoleRedirect: true } });
          break;
        case "teacher":
          navigate("/teacher/analytics", { state: { fromRoleRedirect: true } });
          break;
        case "student":
          navigate("/dashboard", { state: { fromRoleRedirect: true } });
          break;
        default:
          // If unknown role, stay on current page
          break;
      }
    }
  }, [userRole, navigate, isLoading]);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/school-registration" element={<SchoolRegistration />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/about" element={<About />} />
      <Route path="/test-accounts" element={<TestAccounts />} />

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
  );
}

function App() {
  return (
    <React.StrictMode>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </React.StrictMode>
  );
}

export default App;
