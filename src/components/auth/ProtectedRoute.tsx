
import React, { useEffect } from 'react';
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
  const { user, userRole, isLoading, session } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Only show toast notifications if we're not initially loading
    // This prevents flashing error messages during auth state initialization
    if (!isLoading) {
      if (!user || !session) {
        toast.error("You must be logged in to access this page");
      } else if (requiredUserType && userRole !== requiredUserType) {
        toast.error(`Only ${requiredUserType}s can access this page`);
      }
    }
  }, [isLoading, user, session, userRole, requiredUserType]);

  // Show loading state - but only briefly to prevent long waits
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-learnable-blue"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user || !session) {
    // Pass the intended location in state so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (requiredUserType && userRole !== requiredUserType) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;
