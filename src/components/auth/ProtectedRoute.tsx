
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  allowedRoles?: string[];
  requireSupervisor?: boolean;
  requireSameSchool?: boolean;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles,
  requireSupervisor = false,
  requireSameSchool = false,
  redirectTo = "/login",
}) => {
  const { user, userRole, isLoading, isSuperviser, schoolId } = useAuth();
  const location = useLocation();

  // Add safety timeout to prevent infinite loading
  useEffect(() => {
    // Only set timeout if still loading
    if (isLoading) {
      const timeoutId = setTimeout(() => {
        console.warn("ProtectedRoute: Loading timeout reached - may indicate an auth problem");
        // Auth state is taking too long to resolve - could be an issue
        // We don't force a redirect here to avoid breaking legitimate slow loads
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  // If user is explicitly null (not just loading), redirect immediately
  if (!isLoading && !user) {
    console.log("ProtectedRoute: No user detected, redirecting to login");
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Show a brief loading spinner while authentication is being checked
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-learnable-purple" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Check role requirements if specified
  if (requiredRole && userRole !== requiredRole) {
    console.log(`ProtectedRoute: User role ${userRole} doesn't match required role ${requiredRole}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // Check allowed roles if specified
  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    console.log(`ProtectedRoute: User role ${userRole} not in allowed roles`);
    return <Navigate to="/unauthorized" replace />;
  }

  // Check supervisor requirement if specified
  if (requireSupervisor && !isSuperviser) {
    console.log("ProtectedRoute: User is not a supervisor");
    return <Navigate to="/unauthorized" replace />;
  }

  // Check school requirement if specified
  if (requireSameSchool && !schoolId) {
    console.log("ProtectedRoute: User has no school ID");
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authorized, render children
  return <>{children}</>;
};

export default ProtectedRoute;
