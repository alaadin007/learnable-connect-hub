
import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  const { user, userRole, isSupervisor, schoolId, isTestUser } = useAuth();
  const location = useLocation();
  
  // For test users, bypass all permission checks
  if (isTestUser) {
    console.log(`Test user with role ${userRole} accessing area. All permissions granted for testing.`);
    return <>{children || <Outlet />}</>;
  }
  
  // If no user, redirect immediately
  if (!user) {
    console.log("ProtectedRoute: No user detected, access denied");
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Check role requirements
  if (requiredRole && userRole !== requiredRole) {
    console.log(`Access denied: Required role ${requiredRole}, user has ${userRole}`);
    toast.error("You don't have permission to access this page");
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }
  
  // Check allowed roles
  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    console.log(`Access denied: User role ${userRole} not in allowed roles [${allowedRoles.join(", ")}]`);
    toast.error("You don't have permission to access this page");
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // Check supervisor requirement
  if (requireSupervisor && !isSupervisor) {
    console.log("Access denied: Supervisor privileges required");
    toast.error("This action requires supervisor privileges");
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // Check school requirement
  if (requireSameSchool && !schoolId) {
    console.log("Access denied: School association required");
    toast.error("You need to be associated with a school to access this page");
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }
  
  // User is authorized, render children or Outlet
  return <>{children || <Outlet />}</>;
};

export default ProtectedRoute;
