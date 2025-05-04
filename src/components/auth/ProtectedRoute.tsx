
import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children?: React.ReactNode;
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
  const { user, userRole, isSupervisor, schoolId, isLoading, isTestUser } = useAuth();
  const location = useLocation();
  
  // During initial load, show a minimal loading indicator
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // For test users, bypass all permission checks (for easy testing)
  if (isTestUser) {
    console.log(`Test user with role ${userRole} accessing area. All permissions granted for testing.`);
    return <>{children || <Outlet />}</>;
  }
  
  // If no user, redirect to login
  if (!user) {
    console.log("ProtectedRoute: No user detected, redirecting to login");
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Regular permission checks for real users
  
  // Check role requirements if specified
  if (requiredRole && userRole !== requiredRole) {
    console.log(`Access denied: Required role ${requiredRole}, user has ${userRole}`);
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // Check allowed roles if specified
  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    console.log(`Access denied: User role ${userRole} not in allowed roles [${allowedRoles.join(", ")}]`);
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // Check supervisor requirement if specified
  if (requireSupervisor && !isSupervisor) {
    console.log("Access denied: Supervisor privileges required");
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // Check school requirement if specified
  if (requireSameSchool && !schoolId) {
    console.log("Access denied: School association required");
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // User is authorized, render children or Outlet
  return <>{children || <Outlet />}</>;
};

export default ProtectedRoute;
