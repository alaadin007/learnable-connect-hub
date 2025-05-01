
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/invitation" element={<TeacherInvitation />} />

    {/* Basic protected route - just requires authentication */}
    <Route path="/dashboard" element={
      <ProtectedRoute>
        <Dashboard />
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
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
