
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole = 'any',
}) => {
  const { isAuthenticated, userRole, isLoading, isSuperviser, session } = useAuth();

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]"></div>
        <span className="ml-3">Loading...</span>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace />;
  }

  // If no specific role is required, allow access
  if (requiredRole === 'any') {
    return <>{children}</>;
  }

  // Check if user has the required role
  const hasRequiredRole = Array.isArray(requiredRole)
    ? requiredRole.includes(userRole as UserRole)
    : userRole === requiredRole;

  // Special case for supervisors (who can access teacher content)
  const isSupervisorAccessingTeacherContent = 
    isSuperviser && 
    (requiredRole === 'teacher' || 
     (Array.isArray(requiredRole) && requiredRole.includes('teacher')));

  if (hasRequiredRole || isSupervisorAccessingTeacherContent) {
    return <>{children}</>;
  }

  // Redirect to appropriate page based on user role
  if (userRole === 'student') {
    return <Navigate to="/student" replace />;
  } else if (userRole === 'teacher') {
    return <Navigate to="/teacher" replace />;
  } else if (userRole === 'school' || userRole === 'school_admin') {
    return <Navigate to="/admin" replace />;
  }

  // Default fallback
  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
