
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC, AppRole } from "@/contexts/RBACContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: string;
  requireSupervisor?: boolean;
  requireSameSchool?: boolean;
  schoolId?: string;
  allowedRoles?: Array<AppRole>;
  requiredRole?: AppRole;
}

const getRedirectPath = (role: string | undefined | null): string => {
  switch(role) {
    case 'school': return '/admin';
    case 'teacher': return '/teacher/analytics';
    default: return '/dashboard';
  }
};

const ProtectedRoute = ({ 
  children, 
  requiredUserType,
  allowedRoles, 
  requiredRole,
  requireSupervisor = false,
  requireSameSchool = false,
  schoolId
}: ProtectedRouteProps) => {
  const { user, profile, isLoading, userRole, schoolId: userSchoolId } = useAuth();
  const { hasRole, hasAnyRole, isSupervisor, isLoading: rbacLoading } = useRBAC();
  const location = useLocation();

  // Fast path for test accounts - check directly from localStorage first
  const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
  const testAccountType = localStorage.getItem('testAccountType') as string | null;

  if (usingTestAccount && testAccountType) {
    console.log(`ProtectedRoute: Fast test account check for ${testAccountType}`);
    
    // For test accounts, only check role requirements, bypass other checks
    if (requiredUserType && testAccountType !== requiredUserType) {
      console.log(`ProtectedRoute: Test account role ${testAccountType} doesn't match required role ${requiredUserType}`);
      return <Navigate to={getRedirectPath(testAccountType)} replace />;
    }

    if (allowedRoles && testAccountType === 'school' && !allowedRoles.includes('school_admin')) {
      console.log(`ProtectedRoute: Test account type ${testAccountType} not compatible with allowed roles:`, allowedRoles);
      return <Navigate to={getRedirectPath(testAccountType)} replace />;
    }

    if (allowedRoles && testAccountType === 'teacher' && 
        !allowedRoles.includes('teacher') && !allowedRoles.includes('teacher_supervisor')) {
      console.log(`ProtectedRoute: Test account type ${testAccountType} not compatible with allowed roles:`, allowedRoles);
      return <Navigate to={getRedirectPath(testAccountType)} replace />;
    }

    if (allowedRoles && testAccountType === 'student' && !allowedRoles.includes('student')) {
      console.log(`ProtectedRoute: Test account type ${testAccountType} not compatible with allowed roles:`, allowedRoles);
      return <Navigate to={getRedirectPath(testAccountType)} replace />;
    }

    // Skip supervisor and school ID checks for test accounts - allow access
    return <>{children}</>;
  }

  // Show loading indicator while authentication state is being determined
  if (isLoading || rbacLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="inline-flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      </div>
    );
  }

  // Regular account path - if not a test account and no user, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle regular accounts
  console.log("ProtectedRoute: User role:", userRole, "Required role:", requiredUserType);

  // Check for specific required role from RBAC
  if (requiredRole && !hasRole(requiredRole)) {
    console.log(`ProtectedRoute: User doesn't have required role ${requiredRole}`);
    return <Navigate to={getRedirectPath(userRole)} replace />;
  }

  // Check for any of the allowed roles from RBAC
  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    console.log(`ProtectedRoute: User doesn't have any of the allowed roles:`, allowedRoles);
    return <Navigate to={getRedirectPath(userRole)} replace />;
  }

  // Backward compatibility with old user type
  if (requiredUserType && userRole && userRole !== requiredUserType) {
    console.log(`ProtectedRoute: User role ${userRole} doesn't match required role ${requiredUserType}`);
    return <Navigate to={getRedirectPath(userRole)} replace />;
  }

  // For supervisor checks, use the RBAC isSupervisor property
  if (requireSupervisor && !isSupervisor) {
    console.log(`ProtectedRoute: User is not a supervisor`);
    return <Navigate to={getRedirectPath(userRole)} replace />;
  }

  if (requireSameSchool && schoolId && userSchoolId && schoolId !== userSchoolId) {
    console.log(`ProtectedRoute: School ID mismatch - user: ${userSchoolId}, required: ${schoolId}`);
    return <Navigate to={getRedirectPath(userRole)} replace />;
  }

  // If all checks pass, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
