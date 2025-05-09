import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

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
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Check authorization only once to prevent infinite renders
  useEffect(() => {
    // If user is coming from test accounts or has preserveContext state, allow access
    const isPreservedContext = location.state?.fromTestAccounts || location.state?.preserveContext;
    
    if (isPreservedContext) {
      setIsAuthorized(true);
      return;
    }

    // If no user or session, not authorized
    if (!user || !session) {
      setIsAuthorized(false);
      return;
    }

    // If we require a specific user type and the user doesn't have it
    if (requiredUserType && userRole !== requiredUserType) {
      setIsAuthorized(false);
      return;
    }

    // If we require specific roles and the user doesn't have one of them
    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      setIsAuthorized(false);
      return;
    }

    // If we require supervisor access and the user isn't a supervisor
    if (requireSupervisor && !isSuperviser) {
      setIsAuthorized(false);
      return;
    }

    // If we require same school access and the school IDs don't match
    if (requireSameSchool && schoolId && userSchoolId && schoolId !== userSchoolId) {
      setIsAuthorized(false);
      return;
    }

    // If we've gotten to this point, user is authorized
    setIsAuthorized(true);
  }, [
    user, 
    session, 
    userRole, 
    isSuperviser, 
    userSchoolId, 
    requiredUserType, 
    requireSupervisor, 
    requireSameSchool, 
    schoolId, 
    allowedRoles, 
    location.state
  ]);

  // Still determining authorization
  if (isAuthorized === null) {
    return null; // Return nothing while checking to prevent flicker
  }

  // User is authorized
  if (isAuthorized) {
    return <>{children}</>;
  }

  // User is not authorized - handle redirects
  
  // If user isn't logged in, redirect to login
  if (!user || !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Otherwise, redirect based on user role
  const redirectPath = userRole === 'school' ? "/admin" : 
                     userRole === 'teacher' ? "/teacher/analytics" : 
                     "/dashboard";
  
  return <Navigate to={redirectPath} replace />;
};

export default ProtectedRoute;
