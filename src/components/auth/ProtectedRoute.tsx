
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Export UserRole as a type that can be imported elsewhere
export type UserRole = 'student' | 'teacher' | 'school_admin' | 'school';

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
  const { user, userRole, profile, isLoading } = useAuth();
  const location = useLocation();
  
  // Check if the user is logged in
  const isLoggedIn = !!user;
  
  // Check if the user is a supervisor
  const isSupervisor = profile?.is_supervisor || false;
  
  // If still loading auth state, return a minimal loading indicator to avoid flicker
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>;
  }

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
    const userRoleTyped = userRole as UserRole;
    if (!allowedRoles.includes(userRoleTyped)) {
      // Redirect based on role
      if (userRoleTyped === 'school_admin' || userRoleTyped === 'school') {
        return <Navigate to="/admin" replace />;
      } else if (userRoleTyped === 'teacher') {
        return <Navigate to="/teacher/dashboard" replace />;
      } else {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  // User is authorized, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
