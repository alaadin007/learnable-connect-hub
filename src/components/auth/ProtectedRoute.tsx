
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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
  const { isLoggedIn, isLoading, userRole, isSupervisor } = useAuth();

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
    if (!allowedRoles.includes(userRole)) {
      // Redirect based on role
      if (userRole === 'school_admin' || userRole === 'school') {
        return <Navigate to="/admin" replace />;
      } else if (userRole === 'teacher') {
        return <Navigate to="/teacher/dashboard" replace />;
      } else {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
