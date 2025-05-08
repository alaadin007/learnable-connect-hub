
import React, { useEffect, useState } from 'react';
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
  const [showNotification, setShowNotification] = useState(false);

  // Use effect to delay showing error notifications
  // This prevents flashing errors during initial loading
  useEffect(() => {
    // Only show notifications after a short delay and if still not authenticated
    const timer = setTimeout(() => {
      if (!isLoading && showNotification) {
        if (!user || !session) {
          toast.error("You must be logged in to access this page");
        } else if (requiredUserType && userRole !== requiredUserType) {
          toast.error(`Only ${requiredUserType}s can access this page`);
        }
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isLoading, user, session, userRole, requiredUserType, showNotification]);
  
  // Set flag to show notification after initial loading
  useEffect(() => {
    if (!isLoading) {
      setShowNotification(true);
    }
  }, [isLoading]);

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
