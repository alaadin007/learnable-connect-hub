
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const { user, userRole, isLoading, isSupervisor, schoolId, isTestUser } = useAuth();
  const location = useLocation();
  const [forcedTimeout, setForcedTimeout] = useState(false);

  // Further reduced timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      console.log("ProtectedRoute: Setting loading timeout");
      const timeoutId = setTimeout(() => {
        console.warn("ProtectedRoute: Loading timeout reached - forcing resolution");
        setForcedTimeout(true);
      }, 300); // Reduced timeout for better UX

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  // Enhanced error handling - if loading is taking too long, show a more helpful UI
  if ((isLoading && !forcedTimeout)) {
    console.log("ProtectedRoute: Showing loading spinner");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-learnable-purple" />
          <p className="text-gray-600">Verifying access...</p>
          {forcedTimeout && (
            <p className="text-sm text-amber-600 mt-2">
              Taking longer than expected. Please refresh if this persists.
            </p>
          )}
        </div>
      </div>
    );
  }

  // If loading is done and there's no user, redirect immediately
  if (!user) {
    console.log("ProtectedRoute: No user detected, redirecting to login");
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Debug logs to track what's happening
  console.log(`ProtectedRoute checks - User role: ${userRole}, Required role: ${requiredRole}, Supervisor: ${isSupervisor}, isTestUser: ${isTestUser}`);

  // Check role requirements if specified
  if (requiredRole && userRole !== requiredRole) {
    console.log(`ProtectedRoute: User role ${userRole} doesn't match required role ${requiredRole}`);
    toast.error(`Access denied: This area requires ${requiredRole} permissions`);
    return <Navigate to="/unauthorized" replace />;
  }

  // Check allowed roles if specified
  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    console.log(`ProtectedRoute: User role ${userRole} not in allowed roles`);
    toast.error("Access denied: You don't have permission to view this page");
    return <Navigate to="/unauthorized" replace />;
  }

  // Check supervisor requirement if specified
  if (requireSupervisor && !isSupervisor) {
    console.log("ProtectedRoute: User is not a supervisor");
    toast.error("Access denied: This area requires supervisor permissions");
    return <Navigate to="/unauthorized" replace />;
  }

  // Check school requirement if specified
  if (requireSameSchool && !schoolId) {
    console.log("ProtectedRoute: User has no school ID");
    toast.error("Access denied: This area requires school association");
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authorized, render children
  console.log("ProtectedRoute: User authorized, rendering children");
  return <>{children}</>;
};

export default ProtectedRoute;
