
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Export UserRole as a type that can be imported elsewhere
export type UserRole = 'student' | 'teacher' | 'school_admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireSupervisor?: boolean;
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  requireSupervisor = false,
}: ProtectedRouteProps) => {
  const { user, userRole, profile } = useAuth();
  const location = useLocation();
  
  // Check if the user is logged in
  const isLoggedIn = !!user;
  
  // Check if the user is a supervisor
  const isSupervisor = profile?.is_supervisor || false;

  // If not logged in, redirect to login with the return URL
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If supervisor is required, check for that
  if (requireSupervisor && !isSupervisor) {
    return <Navigate to="/dashboard" replace />;
  }

  // If roles are specified, check them
  if (allowedRoles && allowedRoles.length > 0 && userRole) {
    // Normalize the user role
    const normalizedUserRole = userRole === 'school' ? 'school_admin' : userRole as UserRole;
    
    if (!allowedRoles.includes(normalizedUserRole)) {
      // Redirect based on role
      switch (normalizedUserRole) {
        case 'school_admin':
          return <Navigate to="/admin" replace />;
        case 'teacher':
          return <Navigate to="/teacher/dashboard" replace />;
        case 'student':
        default:
          return <Navigate to="/dashboard" replace />;
      }
    }
  }

  // User is authorized, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
