
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
  const { user, userRole, isSupervisor, schoolId, isTestUser } = useAuth();
  const location = useLocation();
  
  // Check for test user in localStorage immediately to prevent flicker
  const storedTestUser = localStorage.getItem("testUser");
  const hasTestUserInStorage = !!storedTestUser;
  
  // For test users, bypass all permission checks and grant access to all routes
  if (hasTestUserInStorage || isTestUser) {
    console.log(`Test user with role ${userRole} accessing area. All permissions granted for testing.`);
    return <>{children || <Outlet />}</>;
  }
  
  // No loading state - make immediate decisions
  
  // If no user, redirect to login
  if (!user) {
    console.log("ProtectedRoute: No user detected, redirecting to login");
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Regular permission checks for real users
  // Check role requirements if specified
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // Check allowed roles if specified
  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // Check supervisor requirement if specified
  if (requireSupervisor && !isSupervisor) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // Check school requirement if specified
  if (requireSameSchool && !schoolId) {
    return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  // User is authorized, render children or Outlet
  return <>{children || <Outlet />}</>;
};

export default ProtectedRoute;
