
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireSupervisor?: boolean;
  requireSameSchool?: boolean;
  schoolId?: string;
  allowedRoles?: Array<UserRole>;
}

const ProtectedRoute = ({ 
  children, 
  requiredRole,
  allowedRoles, 
  requireSupervisor = false,
  requireSameSchool = false,
  schoolId
}: ProtectedRouteProps) => {
  const { user, profile, isSuperviser, isLoading, userRole, schoolId: userSchoolId } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we require a specific user type and the user doesn't have it
  if (requiredRole && userRole !== requiredRole) {
    console.log(`ProtectedRoute: Access denied. Required role: ${requiredRole}, User role: ${userRole}`);
    
    // Redirect based on user role instead of generic dashboard
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    
    return <Navigate to={redirectPath} replace />;
  }

  // If we require specific roles and the user doesn't have one of them
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Redirect based on user role instead of generic dashboard
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // If we require supervisor access and the user isn't a supervisor
  if (requireSupervisor && !isSuperviser) {
    // Redirect based on user role instead of generic dashboard
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // If we require same school access and the school IDs don't match
  if (requireSameSchool && schoolId && userSchoolId && schoolId !== userSchoolId) {
    // Redirect based on user role
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
