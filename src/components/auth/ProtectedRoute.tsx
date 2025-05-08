
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'school' | 'teacher' | 'student';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredUserType
}) => {
  const { user, userRole, session, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-learnable-blue"></div>
        <span className="ml-3 text-gray-600">Checking authentication...</span>
      </div>
    );
  }
  
  // If no user is authenticated, redirect to login
  if (!user || !session) {
    // Toast only when not already on login page to avoid notification spam
    if (!location.pathname.includes('login')) {
      toast.error("You must be logged in to access this page");
    }
    
    // Pass the intended location in state so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (requiredUserType && userRole !== requiredUserType) {
    toast.error(`Only ${requiredUserType}s can access this page`);
    
    // Redirect to appropriate dashboard based on actual role
    if (userRole === 'school' || userRole === 'school_admin') {
      return <Navigate to="/admin" replace />;
    } else if (userRole === 'teacher' || userRole === 'teacher_supervisor') {
      return <Navigate to="/teacher/analytics" replace />;
    }
    
    // Default dashboard fallback
    return <Navigate to="/dashboard" replace />;
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;
