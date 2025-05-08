
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: UserRole;
  requireSupervisor?: boolean;
  requireSameSchool?: boolean;
  schoolId?: string;
  allowedRoles?: Array<UserRole>;
}

const ProtectedRoute = ({ 
  children, 
  requiredUserType,
  allowedRoles, 
  requireSupervisor = false,
  requireSameSchool = false,
  schoolId
}: ProtectedRouteProps) => {
  const { user, profile, isSuperviser, isLoading, userRole, schoolId: userSchoolId, session } = useAuth();
  const location = useLocation();

  // Show loading state while we check authentication
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If no user or session, redirect to login
  if (!user || !session) {
    console.log("ProtectedRoute: No authenticated user found, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we require a specific user type and the user doesn't have it
  if (requiredUserType && userRole !== requiredUserType) {
    console.log(`ProtectedRoute: User role ${userRole} doesn't match required ${requiredUserType}`);
    // Redirect based on user role instead of generic dashboard
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // If we require specific roles and the user doesn't have one of them
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    console.log(`ProtectedRoute: User role ${userRole} not in allowed roles`);
    // Redirect based on user role instead of generic dashboard
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // If we require supervisor access and the user isn't a supervisor
  if (requireSupervisor && !isSuperviser) {
    console.log("ProtectedRoute: User is not a supervisor");
    // Redirect based on user role instead of generic dashboard
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // If we require same school access and the school IDs don't match
  if (requireSameSchool && schoolId && userSchoolId && schoolId !== userSchoolId) {
    console.log(`ProtectedRoute: School ID mismatch - user: ${userSchoolId}, required: ${schoolId}`);
    // Redirect based on user role
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
