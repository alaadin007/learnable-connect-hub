
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
  const { user, userRole, isLoading, isSupervisor, schoolId, isTestUser } = useAuth();
  const location = useLocation();
  const [forcedTimeout, setForcedTimeout] = useState(false);
  
  // Check for test user in localStorage immediately to prevent flicker
  const storedTestUser = localStorage.getItem("testUser");
  const hasTestUserInStorage = !!storedTestUser;
  
  // Skip the loading state completely for test users
  if (hasTestUserInStorage && isTestUser) {
    // For test users, only enforce that they can't access areas for different roles
    if (requiredRole && userRole !== requiredRole) {
      console.log(`Test user with role ${userRole} trying to access area requiring ${requiredRole}`);
      return <Navigate to="/test-accounts" replace />;
    }
    
    // Test users can skip other permission checks
    return <>{children}</>;
  }
  
  // Set a short timeout to force a decision on the authentication status for real users
  useEffect(() => {
    // Skip the timeout if we already have a test user in storage
    if (hasTestUserInStorage) return;
    
    // For real users, enforce a decision after a short timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setForcedTimeout(true);
    }, 400); // Reduced from 500ms to 400ms to make it more responsive

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasTestUserInStorage]);

  // Debug logging to help trace auth issues
  useEffect(() => {
    console.log("ProtectedRoute state:", { 
      isLoading, 
      forcedTimeout, 
      userExists: !!user, 
      userRole, 
      currentPath: location.pathname,
      isTestUser,
      hasTestUserInStorage
    });
  }, [isLoading, forcedTimeout, user, userRole, location.pathname, isTestUser, hasTestUserInStorage]);
  
  // Only show loading spinner for a reasonable time and not for test users
  if (isLoading && !forcedTimeout && !hasTestUserInStorage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-learnable-blue" />
          <p className="text-gray-600 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // After timeout or if loading is complete, make a decision based on current auth state
  if (!user) {
    console.log("ProtectedRoute: No user detected, redirecting to login");
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Special handling for test users - allow them more flexibly
  if (isTestUser) {
    // For test users, we'll only enforce that they can't access areas for different roles
    if (requiredRole && userRole !== requiredRole) {
      console.log(`Test user with role ${userRole} trying to access area requiring ${requiredRole}`);
      return <Navigate to="/test-accounts" replace />;
    }
    
    // Test users can skip other permission checks
    return <>{children}</>;
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

  // User is authorized, render children
  return <>{children}</>;
};

export default ProtectedRoute;
