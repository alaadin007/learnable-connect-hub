
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
  const { user, userRole, session } = useAuth();
  const location = useLocation();

  // If no user is authenticated, redirect to login
  if (!user || !session) {
    // Only show toast when not already on login page
    if (!location.pathname.includes('login')) {
      toast.error("You must be logged in to access this page");
    }
    
    // Pass the intended location in state so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (requiredUserType && userRole !== requiredUserType) {
    // Map similar role types for compatibility
    const normalizedUserRole = userRole === 'school_admin' ? 'school' : 
                              (userRole === 'teacher_supervisor' ? 'teacher' : userRole);
    const normalizedRequiredRole = requiredUserType === 'school_admin' ? 'school' : 
                                  (requiredUserType === 'teacher_supervisor' ? 'teacher' : requiredUserType);
                                  
    if (normalizedUserRole !== normalizedRequiredRole) {
      toast.error(`Only ${requiredUserType}s can access this page`);
      
      // Redirect to appropriate dashboard based on actual role
      if (normalizedUserRole === 'school') {
        return <Navigate to="/admin" replace />;
      } else if (normalizedUserRole === 'teacher') {
        return <Navigate to="/teacher/analytics" replace />;
      } else if (normalizedUserRole === 'student') {
        return <Navigate to="/dashboard" replace />;
      }
      
      // Default dashboard fallback
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;
