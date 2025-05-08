
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
  const { isAuthenticated, isLoading, userType, isTestAccount } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log for debugging purposes
    console.log('ProtectedRoute:', { 
      isAuthenticated, 
      isLoading, 
      userType, 
      requiredUserType, 
      isTestAccount,
      fromTestAccounts: location.state?.fromTestAccounts 
    });
  }, [isAuthenticated, isLoading, userType, requiredUserType, isTestAccount, location.state]);

  // Always allow access if coming from test accounts
  if (isTestAccount || location.state?.fromTestAccounts) {
    console.log('ProtectedRoute: Allowing access for test account');
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login if not authenticated, preserving the attempted URL
    console.log('ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check user type if specified
  if (requiredUserType !== 'any' && userType !== requiredUserType) {
    // Check if user has a higher level role (e.g., school admin has teacher access)
    if (requiredUserType === 'teacher' && userType === 'school') {
      // School admins can access teacher pages
      console.log('ProtectedRoute: School admin accessing teacher page');
      return <>{children}</>;
    }

    // Redirect to appropriate dashboard based on actual user type
    console.log(`ProtectedRoute: User type ${userType} doesn't match required type ${requiredUserType}, redirecting`);
    
    let redirectPath = '/dashboard';
    switch (userType) {
      case 'student':
        redirectPath = '/student/dashboard';
        break;
      case 'teacher':
        redirectPath = '/teacher/dashboard';
        break;
      case 'school':
        redirectPath = '/admin';
        break;
    }

    return <Navigate to={redirectPath} replace />;
  }

  console.log('ProtectedRoute: Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;
