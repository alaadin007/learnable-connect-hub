
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
    toast.error("You must be logged in to access this page");
    // Pass the intended location in state so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (requiredUserType && userRole !== requiredUserType) {
    toast.error(`Only ${requiredUserType}s can access this page`);
    return <Navigate to="/dashboard" replace />;
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;
