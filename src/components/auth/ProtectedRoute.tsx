
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useEffect } from "react";

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

  // If no user or session, redirect to login
  if (!user || !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we require a specific user type and the user doesn't have it
  if (requiredUserType && userRole !== requiredUserType) {
    // Determine where to redirect based on user role
    let redirectPath;
    if (userRole === 'school' || userRole === 'school_admin') {
      redirectPath = "/admin";
    } else if (userRole === 'teacher') {
      redirectPath = "/teacher/analytics";
    } else {
      redirectPath = "/dashboard";
    }
    
    return <Navigate to={redirectPath} replace />;
  }

  // If we require specific roles and the user doesn't have one of them
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Determine where to redirect based on user role
    let redirectPath;
    if (userRole === 'school' || userRole === 'school_admin') {
      redirectPath = "/admin";
    } else if (userRole === 'teacher') {
      redirectPath = "/teacher/analytics";
    } else {
      redirectPath = "/dashboard";
    }
    
    return <Navigate to={redirectPath} replace />;
  }

  // If we require supervisor access and the user isn't a supervisor
  if (requireSupervisor && !isSuperviser) {
    return <Navigate to="/dashboard" replace />;
  }

  // If we require same school access and the school IDs don't match
  if (requireSameSchool && schoolId && userSchoolId && schoolId !== userSchoolId) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is authorized
  return <>{children}</>;
};

export default ProtectedRoute;
