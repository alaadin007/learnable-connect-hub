
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { getUserRoleWithFallback, getSchoolIdWithFallback, isSchoolAdmin } from "@/utils/apiHelpers";

// Define a proper type for the location state
interface LocationState {
  from?: Location;
  preserveContext?: boolean;
  fromNavigation?: boolean;
  adminRedirect?: boolean;
  fromTestAccounts?: boolean;
  schoolAdminReturn?: boolean;
  [key: string]: any; // Allow for additional properties
}

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
  const locationState = location.state as LocationState | null;

  // Try to get role and school ID from localStorage if not available from auth context
  const fallbackRole = getUserRoleWithFallback();
  const effectiveUserRole = userRole || fallbackRole;
  
  console.log('ProtectedRoute: Current path:', location.pathname);
  console.log('ProtectedRoute: User role:', effectiveUserRole);
  console.log('ProtectedRoute: Is school admin:', isSchoolAdmin(effectiveUserRole));
  console.log('ProtectedRoute: Location state:', locationState);
  
  // CRITICAL CHECK: If user is school admin, force redirect to admin dashboard when on /dashboard
  // This is the highest priority check - it happens before ANY other checks
  if (isSchoolAdmin(effectiveUserRole) && location.pathname === '/dashboard') {
    console.log("PROTECTED ROUTE: School admin detected on /dashboard, forcing redirect to /admin");
    // Use replace: true to prevent back button from returning to /dashboard
    return <Navigate to="/admin" state={{ preserveContext: true, adminRedirect: true }} replace />;
  }

  // Check if we're redirected from Chat, Documents or other pages
  // and need to go to the admin dashboard for school admins
  const fromOtherPage = locationState?.fromNavigation === true;
  const isSchoolAdminReturn = locationState?.schoolAdminReturn === true;
  
  // Enhanced admin redirect check - more comprehensive locations and conditions
  if (isSchoolAdmin(effectiveUserRole) && 
      (fromOtherPage || isSchoolAdminReturn || 
       ['/chat', '/documents'].includes(location.pathname))) {
    
    console.log("PROTECTED ROUTE: School admin detected on a shared page, redirecting to /admin if not already there");
    
    // Only redirect if not already on the admin dashboard
    if (location.pathname !== '/admin') {
      console.log("PROTECTED ROUTE: Redirecting school admin to /admin dashboard");
      return <Navigate to="/admin" state={{ preserveContext: true, adminRedirect: true }} replace />;
    }
  }

  // Check for special navigation states or preserved context
  const isPreservedContext = locationState?.fromTestAccounts || locationState?.preserveContext;
  
  // If we have preserved context, allow access
  if (isPreservedContext) {
    return <>{children}</>;
  }

  const fallbackSchoolId = getSchoolIdWithFallback();
  const effectiveSchoolId = userSchoolId || fallbackSchoolId;

  // Enhanced debug logging
  console.log('ProtectedRoute check:', { 
    effectiveUserRole, 
    requiredUserType, 
    allowedRoles,
    isSchoolAdmin: isSchoolAdmin(effectiveUserRole),
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
    if (isSchoolAdmin(effectiveUserRole)) {
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
    if (isSchoolAdmin(effectiveUserRole)) {
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
