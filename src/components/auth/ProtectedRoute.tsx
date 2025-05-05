
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
  const { user, profile, isSuperviser, isLoading, userRole, schoolId: userSchoolId } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Log current user role for debugging
  console.log("ProtectedRoute: User role:", userRole, "Required role:", requiredUserType);

  // If we require a specific user type and the user doesn't have it
  if (requiredUserType && userRole !== requiredUserType) {
    console.log(`ProtectedRoute: User role ${userRole} doesn't match required role ${requiredUserType}`);
    // Redirect based on user role instead of generic dashboard
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // If we require specific roles and the user doesn't have one of them
  if (allowedRoles && userRole && !allowedRoles.includes(userRole as UserRole)) {
    console.log(`ProtectedRoute: User role ${userRole} not in allowed roles:`, allowedRoles);
    // Redirect based on user role instead of generic dashboard
    const redirectPath = userRole === 'school' ? '/admin' : 
                        userRole === 'teacher' ? '/teacher/analytics' : 
                        '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // If we require supervisor access and the user isn't a supervisor
  if (requireSupervisor && !isSuperviser) {
    console.log(`ProtectedRoute: User is not a supervisor`);
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
