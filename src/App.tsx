import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/SchoolAdmin";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "./App.css";
import Pricing from "./pages/Pricing";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import About from "./pages/About";
import TestAccounts from "./pages/TestAccounts";
import TeacherDashboard from "./pages/TeacherDashboard";
import SchoolSettings from "./pages/SchoolSettings";
import TeacherManagementPage from "./pages/TeacherManagementPage";
import StudentManagementPage from "./pages/StudentManagementPage";

// Add the import for AdminTools
import AdminTools from "./pages/AdminTools";

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
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
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
            <Admin />
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
            <TeacherManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute requiredRole="school">
            <StudentManagementPage />
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
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />

      {/* Add the route for AdminTools inside your Routes component */}
      <Route path="/admin/tools" element={<AdminTools />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
