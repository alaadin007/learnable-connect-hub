
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
  const { user, profile, isSuperviser, userRole, schoolId: userSchoolId, session } = useAuth();
  const location = useLocation();

  // If user is coming from test accounts or has preserveContext state, allow access
  const isPreservedContext = location.state?.fromTestAccounts || location.state?.preserveContext;
  
  if (isPreservedContext) {
    return <>{children}</>;
  }

  // If no user or session, redirect to login
  if (!user || !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we require a specific user type and the user doesn't have it
  if (requiredUserType && userRole !== requiredUserType) {
    // Redirect based on user role
    const redirectPath = userRole === 'school' ? "/admin" : 
                        userRole === 'teacher' ? "/teacher/analytics" : 
                        "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  // If we require specific roles and the user doesn't have one of them
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Redirect based on user role
    const redirectPath = userRole === 'school' ? "/admin" : 
                        userRole === 'teacher' ? "/teacher/analytics" : 
                        "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  // If we require supervisor access and the user isn't a supervisor
  if (requireSupervisor && !isSuperviser) {
    // Redirect based on user role
    const redirectPath = userRole === 'school' ? "/admin" : 
                        userRole === 'teacher' ? "/teacher/analytics" : 
                        "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  // If we require same school access and the school IDs don't match
  if (requireSameSchool && schoolId && userSchoolId && schoolId !== userSchoolId) {
    // Redirect based on user role
    const redirectPath = userRole === 'school' ? "/admin" : 
                        userRole === 'teacher' ? "/teacher/analytics" : 
                        "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
