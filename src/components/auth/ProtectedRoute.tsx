
import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserType?: 'student' | 'teacher' | 'school' | 'any';
}

const ProtectedRoute = ({ 
  children, 
  requiredUserType = 'any' 
}: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, userType } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log for debugging purposes
    console.log('ProtectedRoute:', { isAuthenticated, isLoading, userType, requiredUserType });
  }, [isAuthenticated, isLoading, userType, requiredUserType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated, preserving the attempted URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check user type if specified
  if (requiredUserType !== 'any' && userType !== requiredUserType) {
    // Check if user has a higher level role (e.g., school admin has teacher access)
    if (requiredUserType === 'teacher' && userType === 'school') {
      // School admins can access teacher pages
      return <>{children}</>;
    }

    // Redirect to appropriate dashboard based on actual user type
    let redirectPath = '/';
    switch (userType) {
      case 'student':
        redirectPath = '/student/dashboard';
        break;
      case 'teacher':
        redirectPath = '/teacher/dashboard';
        break;
      case 'school':
        redirectPath = '/school/dashboard';
        break;
    }

    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
