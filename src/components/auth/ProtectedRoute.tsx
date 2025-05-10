
import React from 'react';
import { Navigate } from 'react-router-dom';
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
  const { user, userRole, profile, loading: isLoading } = useAuth();
  const isLoggedIn = !!user;
  const isSupervisor = profile?.is_supervisor || false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-learnable-blue"></div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
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

  return <>{children}</>;
};

export default ProtectedRoute;
