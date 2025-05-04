
import React, { useEffect, useState } from "react";
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
  const { user, userRole, isLoading, isSupervisor, schoolId } = useAuth();
  const location = useLocation();
  const [forcedTimeout, setForcedTimeout] = useState(false);

  // Add safety timeout to prevent infinite loading
  useEffect(() => {
    // Only set timeout if still loading
    if (isLoading) {
      console.log("ProtectedRoute: Setting loading timeout");
      const timeoutId = setTimeout(() => {
        console.warn("ProtectedRoute: Loading timeout reached - forcing resolution");
        setForcedTimeout(true);
      }, 1500); // Reduced timeout to 1.5 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  // If user is explicitly null (not just loading), redirect immediately
  if (!isLoading && !user) {
    console.log("ProtectedRoute: No user detected, redirecting to login");
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Use the forced timeout to proceed if loading takes too long
  if (isLoading && !forcedTimeout) {
    console.log("ProtectedRoute: Showing loading spinner");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-learnable-purple" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Debug logs to track what's happening
  console.log(`ProtectedRoute checks - User role: ${userRole}, Required role: ${requiredRole}, Supervisor: ${isSupervisor}`);

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
  if (requireSupervisor && !isSupervisor) {
    console.log("ProtectedRoute: User is not a supervisor");
    return <Navigate to="/unauthorized" replace />;
  }

  // Check school requirement if specified
  if (requireSameSchool && !schoolId) {
    console.log("ProtectedRoute: User has no school ID");
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authorized, render children
  console.log("ProtectedRoute: User authorized, rendering children");
  return <>{children}</>;
};

export default ProtectedRoute;
