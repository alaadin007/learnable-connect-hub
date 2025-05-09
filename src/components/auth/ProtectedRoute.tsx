
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { getUserRoleWithFallback, getSchoolIdWithFallback } from "@/utils/apiHelpers";

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

  // Check for special navigation states or preserved context
  const isPreservedContext = location.state?.fromTestAccounts || location.state?.preserveContext;
  
  // If we have preserved context, allow access
  if (isPreservedContext) {
    return <>{children}</>;
  }

  // Try to get role and school ID from localStorage if not available from auth context
  const fallbackRole = getUserRoleWithFallback();
  const fallbackSchoolId = getSchoolIdWithFallback();
  
  const effectiveUserRole = userRole || fallbackRole;
  const effectiveSchoolId = userSchoolId || fallbackSchoolId;

  // Debug logging
  console.log('ProtectedRoute check:', { 
    effectiveUserRole, 
    requiredUserType, 
    allowedRoles,
    path: location.pathname
  });

  // If no user or session, redirect to login
  if (!user && !session && !isPreservedContext) {
    console.log("No user or session, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we require a specific user type and the user doesn't have it
  if (requiredUserType && effectiveUserRole !== requiredUserType) {
    console.log(`Required user type: ${requiredUserType}, actual: ${effectiveUserRole}`);
    
    // Determine where to redirect based on user role
    let redirectPath;
    if (effectiveUserRole === 'school' || effectiveUserRole === 'school_admin') {
      redirectPath = "/admin";
    } else if (effectiveUserRole === 'teacher') {
      redirectPath = "/teacher/analytics";
    } else {
      redirectPath = "/dashboard";
    }
    
    return <Navigate to={redirectPath} state={{ preserveContext: true }} replace />;
  }

  // If we require specific roles and the user doesn't have one of them
  if (allowedRoles && effectiveUserRole && !allowedRoles.includes(effectiveUserRole as UserRole)) {
    console.log(`Allowed roles: ${allowedRoles}, actual: ${effectiveUserRole}`);
    
    // Determine where to redirect based on user role
    let redirectPath;
    if (effectiveUserRole === 'school' || effectiveUserRole === 'school_admin') {
      redirectPath = "/admin";
    } else if (effectiveUserRole === 'teacher') {
      redirectPath = "/teacher/analytics";
    } else {
      redirectPath = "/dashboard";
    }
    
    return <Navigate to={redirectPath} state={{ preserveContext: true }} replace />;
  }

  // If we require supervisor access and the user isn't a supervisor
  if (requireSupervisor && !isSuperviser) {
    console.log("User is not a supervisor");
    return <Navigate to="/dashboard" state={{ preserveContext: true }} replace />;
  }

  // If we require same school access and the school IDs don't match
  if (requireSameSchool && schoolId && effectiveSchoolId && schoolId !== effectiveSchoolId) {
    console.log(`School ID mismatch: required ${schoolId}, actual ${effectiveSchoolId}`);
    return <Navigate to="/dashboard" state={{ preserveContext: true }} replace />;
  }

  // User is authorized
  return <>{children}</>;
};

export default ProtectedRoute;
