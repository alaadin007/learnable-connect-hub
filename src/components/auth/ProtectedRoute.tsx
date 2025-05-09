
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCallback, useEffect } from "react";

// Define a proper type for the location state
interface LocationState {
  from?: Location;
  preserveContext?: boolean;
  fromNavigation?: boolean;
  adminRedirect?: boolean;
  fromTestAccounts?: boolean;
  schoolAdminReturn?: boolean;
  accountType?: string;
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

// Moved this helper function to the top level for clarity
const isSchoolAdmin = (role: UserRole | null): boolean => {
  return role === 'school' || role === 'school_admin';
};

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
  
  // Logging for easier debugging
  useEffect(() => {
    console.log('ProtectedRoute: Current path:', location.pathname);
    console.log('ProtectedRoute: User role:', userRole);
    console.log('ProtectedRoute: Is school admin:', isSchoolAdmin(userRole));
    console.log('ProtectedRoute: Location state:', locationState);
  }, [location.pathname, userRole, locationState]);

  // Check for special navigation states or preserved context
  // This handles test accounts and preserved context - CRITICAL for proper navigation
  const isSpecialContext = useCallback(() => {
    // Test accounts always get access
    if (locationState?.fromTestAccounts) {
      console.log('ProtectedRoute: Access granted due to test account flow');
      return true;
    }
    
    // Check for preserved context from navigation
    if (locationState?.preserveContext) {
      console.log('ProtectedRoute: Access granted due to preserved context');
      return true;
    }
    
    // Check if this is a test user by looking at sessionStorage
    const testAccountType = sessionStorage.getItem('testAccountType');
    if (testAccountType) {
      console.log('ProtectedRoute: Access granted due to test account type:', testAccountType);
      return true;
    }
    
    return false;
  }, [locationState]);

  // If we have special context, allow access immediately
  if (isSpecialContext()) {
    return <>{children}</>;
  }

  // If no user or session, redirect to login, except for admin routes in preview mode
  if (!user && !session && !location.pathname.startsWith('/admin')) {
    console.log("No user or session, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // IMPORTANT: Fixed admin route access logic
  // If we're on an admin route and either:
  // 1. We have a user with school admin role, OR
  // 2. We're in preview mode with no role but on an admin page, OR
  // 3. We have preserved context
  if (location.pathname.startsWith('/admin')) {
    if (isSchoolAdmin(userRole) || 
        (!userRole && location.pathname.startsWith('/admin')) || 
        locationState?.preserveContext === true) {
      console.log('Admin access granted - school admin or preview mode or preserved context');
      return <>{children}</>;
    }
    
    // If not a school admin but trying to access admin routes, redirect to appropriate dashboard
    if (userRole === 'teacher') {
      toast.error("You don't have permission to access the admin area");
      return <Navigate to="/teacher/students" state={{ preserveContext: true }} replace />;
    } else if (userRole === 'student') {
      toast.error("You don't have permission to access the admin area");
      return <Navigate to="/dashboard" state={{ preserveContext: true }} replace />;
    }
    
    return <Navigate to="/dashboard" state={{ preserveContext: true }} replace />;
  }

  // HIGHEST PRIORITY CHECK:
  // If user is on /dashboard and they're a school admin, ALWAYS redirect to /admin
  if (location.pathname === '/dashboard' && isSchoolAdmin(userRole)) {
    console.log("PROTECTED ROUTE: School admin detected on /dashboard, forcing redirect to /admin");
    // Use replace: true to prevent back button from returning to /dashboard
    return <Navigate to="/admin" state={{ preserveContext: true, adminRedirect: true }} replace />;
  }
  
  // Student-specific dashboard checking
  if (userRole === 'student' && location.pathname === '/dashboard') {
    console.log("Student on dashboard - rendering dashboard view");
    return <>{children}</>;
  }

  // Student trying to access teacher or admin pages
  if (userRole === 'student' && 
     (location.pathname.startsWith('/admin') || 
      location.pathname.startsWith('/teacher'))) {
    console.log("Student attempting to access restricted teacher/admin area, redirecting to student dashboard");
    toast.error("You don't have permission to access that area");
    return <Navigate to="/dashboard" state={{ preserveContext: true }} replace />;
  }
  
  // Teacher trying to access admin pages
  if (userRole === 'teacher' && location.pathname.startsWith('/admin')) {
    console.log("Teacher attempting to access restricted admin area, redirecting to teacher dashboard");
    toast.error("You don't have permission to access that area");
    return <Navigate to="/teacher/students" state={{ preserveContext: true }} replace />;
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

export default ProtectedRoute;
