
import React, { useEffect } from "react";
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
import "./App.css";

function AppRoutes() {
  const { userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect based on user role after login
    if (userRole) {
      switch (userRole) {
        case "school":
          navigate("/admin");
          break;
        case "teacher":
          navigate("/teacher/analytics");
          break;
        default:
          navigate("/dashboard");
          break;
      }
    }
  }, [userRole, navigate]);

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
        path="/teacher/analytics"
        element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherAnalytics />
          </ProtectedRoute>
        }
      />

      {/* Add the route for AdminTools inside your Routes component */}
      <Route 
        path="/admin/tools" 
        element={
          <ProtectedRoute requiredRole="school">
            <AdminTools />
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
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
