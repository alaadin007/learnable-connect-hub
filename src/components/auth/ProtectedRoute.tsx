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

const getRedirectPath = (role: UserRole | undefined | null): string => {
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
  requireSupervisor = false,
  requireSameSchool = false,
  schoolId
}: ProtectedRouteProps) => {
  const { user, profile, isSupervisor, isLoading, userRole, schoolId: userSchoolId } = useAuth();
  const location = useLocation();

  // Check if we're using a test account
  const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
  const testAccountType = localStorage.getItem('testAccountType') as UserRole | null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        {/* You could replace this with a Spinner/Loader component */}
        Loading...
      </div>
    );
  }

  if (!user && !usingTestAccount) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (usingTestAccount && testAccountType) {
    if (requiredUserType && testAccountType !== requiredUserType) {
      console.log(`ProtectedRoute: Test account role ${testAccountType} doesn't match required role ${requiredUserType}`);
      return <Navigate to={getRedirectPath(testAccountType)} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(testAccountType)) {
      console.log(`ProtectedRoute: Test account role ${testAccountType} not in allowed roles:`, allowedRoles);
      return <Navigate to={getRedirectPath(testAccountType)} replace />;
    }

    if (requireSupervisor && testAccountType !== 'school') {
      console.log(`ProtectedRoute: Test account is not a supervisor`);
      return <Navigate to={getRedirectPath(testAccountType)} replace />;
    }

  } else {
    console.log("ProtectedRoute: User role:", userRole, "Required role:", requiredUserType);

    if (requiredUserType && userRole && userRole !== requiredUserType) {
      console.log(`ProtectedRoute: User role ${userRole} doesn't match required role ${requiredUserType}`);
      return <Navigate to={getRedirectPath(userRole)} replace />;
    }

    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      console.log(`ProtectedRoute: User role ${userRole} not in allowed roles:`, allowedRoles);
      return <Navigate to={getRedirectPath(userRole)} replace />;
    }

    if (requireSupervisor && !isSupervisor) {
      console.log(`ProtectedRoute: User is not a supervisor`);
      return <Navigate to={getRedirectPath(userRole)} replace />;
    }

    if (requireSameSchool && schoolId && userSchoolId && schoolId !== userSchoolId) {
      console.log(`ProtectedRoute: School ID mismatch - user: ${userSchoolId}, required: ${schoolId}`);
      return <Navigate to={getRedirectPath(userRole)} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;