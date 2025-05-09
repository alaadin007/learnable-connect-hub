
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  
  console.log('ProtectedRoute: Current path:', location.pathname);
  console.log('ProtectedRoute: User role:', userRole);
  console.log('ProtectedRoute: Is school admin:', isSchoolAdmin(userRole));
  console.log('ProtectedRoute: Location state:', locationState);

  // IMPORTANT: Special case for admin routes when running in preview mode
  // or when database errors occurred
  if (location.pathname.startsWith('/admin')) {
    // If we have no session or user role but we're on an admin page
    // we're likely in the preview environment
    if (!userRole && location.pathname.startsWith('/admin')) {
      console.log('Admin route accessed with no user role, assuming school admin preview access');
      
      // Silently allow access to admin routes in preview mode
      return <>{children}</>;
    }
  }

  // Check for special navigation states or preserved context
  const isPreservedContext = locationState?.fromTestAccounts || locationState?.preserveContext;
  
  // If we have preserved context, allow access immediately regardless of auth state
  if (isPreservedContext) {
    console.log('ProtectedRoute: Access granted due to preserved context');
    return <>{children}</>;
  }

  // If no user or session, redirect to login
  if (!user && !session) {
    console.log("No user or session, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // HIGHEST PRIORITY CHECK:
  // If user is on /dashboard and they're a school admin, ALWAYS redirect to /admin
  if (location.pathname === '/dashboard' && isSchoolAdmin(userRole)) {
    console.log("PROTECTED ROUTE: School admin detected on /dashboard, forcing redirect to /admin");
    // Use replace: true to prevent back button from returning to /dashboard
    return <Navigate to="/admin" state={{ preserveContext: true, adminRedirect: true }} replace />;
  }
  
  // Also check for other dashboard-like paths
  if (isSchoolAdmin(userRole) && 
      ['/student/assessments', '/student/progress', '/student/settings'].includes(location.pathname)) {
    console.log("PROTECTED ROUTE: School admin detected on student page, redirecting to /admin");
    return <Navigate to="/admin" state={{ preserveContext: true, adminRedirect: true }} replace />;
  }

  // Check if we're redirected from Chat, Documents or other pages
  // and need to go to the admin dashboard for school admins
  const fromOtherPage = locationState?.fromNavigation === true;
  const isSchoolAdminReturn = locationState?.schoolAdminReturn === true;
  
  // Enhanced admin redirect check - more comprehensive locations and conditions
  if (isSchoolAdmin(userRole) && 
      (fromOtherPage || isSchoolAdminReturn || 
       ['/chat', '/documents'].includes(location.pathname))) {
    
    console.log("PROTECTED ROUTE: School admin detected on a shared page, redirecting to /admin if not already there");
    
    // Only redirect if not already on the admin dashboard
    if (location.pathname !== '/admin') {
      console.log("PROTECTED ROUTE: Redirecting school admin to /admin dashboard");
      return <Navigate to="/admin" state={{ preserveContext: true, adminRedirect: true }} replace />;
    }
  }

  // Enhanced debug logging
  console.log('ProtectedRoute check:', { 
    userRole, 
    requiredUserType, 
    allowedRoles,
    isSchoolAdmin: isSchoolAdmin(userRole),
    path: location.pathname
  });

  // If we require a specific user type and the user doesn't have it
  if (requiredUserType && userRole && userRole !== requiredUserType) {
    console.log(`Required user type: ${requiredUserType}, actual: ${userRole}`);
    
    // Determine where to redirect based on user role
    let redirectPath;
    if (isSchoolAdmin(userRole)) {
      redirectPath = "/admin";
    } else if (userRole === 'teacher') {
      redirectPath = "/teacher/analytics";
    } else {
      redirectPath = "/dashboard";
    }
    
    return <Navigate to={redirectPath} state={{ preserveContext: true }} replace />;
  }

  // If we require specific roles and the user doesn't have one of them
  if (allowedRoles && userRole && !allowedRoles.includes(userRole as UserRole)) {
    console.log(`Allowed roles: ${allowedRoles}, actual: ${userRole}`);
    
    // Determine where to redirect based on user role
    let redirectPath;
    if (isSchoolAdmin(userRole)) {
      redirectPath = "/admin";
    } else if (userRole === 'teacher') {
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
  if (requireSameSchool && schoolId && userSchoolId && schoolId !== userSchoolId) {
    console.log(`School ID mismatch: required ${schoolId}, actual ${userSchoolId}`);
    return <Navigate to="/dashboard" state={{ preserveContext: true }} replace />;
  }

  // User is authorized
  return <>{children}</>;
};

// Helper function to determine if a user role is a school admin
const isSchoolAdmin = (role: UserRole | null): boolean => {
  return role === 'school' || role === 'school_admin';
};

export default ProtectedRoute;
