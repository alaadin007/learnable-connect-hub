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
  const [isChecking, setIsChecking] = useState(true);

  // Check authorization only once to prevent infinite renders
  useEffect(() => {
    const checkAuthorization = () => {
      // If user is coming from test accounts or has preserveContext state, allow access
      const isPreservedContext = location.state?.fromTestAccounts || location.state?.preserveContext;
      
      if (isPreservedContext) {
        setIsAuthorized(true);
        setIsChecking(false);
        return;
      }

      // If no user or session, not authorized
      if (!user || !session) {
        console.log("ProtectedRoute: No authenticated user found, redirecting to login");
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // If we require a specific user type and the user doesn't have it
      if (requiredUserType && userRole !== requiredUserType) {
        console.log(`ProtectedRoute: User role ${userRole} doesn't match required role ${requiredUserType}`);
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // If we require specific roles and the user doesn't have one of them
      if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        console.log(`ProtectedRoute: User role ${userRole} not in allowed roles [${allowedRoles.join(', ')}]`);
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // If we require supervisor access and the user isn't a supervisor
      if (requireSupervisor && !isSuperviser) {
        console.log("ProtectedRoute: Supervisor access required but user is not a supervisor");
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // If we require same school access and the school IDs don't match
      if (requireSameSchool && schoolId && userSchoolId && schoolId !== userSchoolId) {
        console.log(`ProtectedRoute: School access mismatch ${schoolId} vs ${userSchoolId}`);
        setIsAuthorized(false);
        setIsChecking(false);
        return;
      }

      // If we've gotten to this point, user is authorized
      console.log(`ProtectedRoute: User authorized with role ${userRole}`);
      setIsAuthorized(true);
      setIsChecking(false);
    };

    // Small delay to ensure Auth context is fully initialized
    const timeoutId = setTimeout(checkAuthorization, 50);
    return () => clearTimeout(timeoutId);
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
  if (isChecking || isAuthorized === null) {
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
  let redirectPath;
  if (userRole === 'school' || userRole === 'school_admin') {
    redirectPath = "/admin";
  } else if (userRole === 'teacher') {
    redirectPath = "/teacher/analytics";
  } else {
    redirectPath = "/dashboard";
  }
  
  return <Navigate to={redirectPath} replace />;
};

export default ProtectedRoute;
