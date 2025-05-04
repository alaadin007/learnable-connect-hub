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
  const [forceDecision, setForceDecision] = useState(false);
  
  // Set a short timeout to force a decision on the authentication status
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setForcedTimeout(true);
    }, 500);
    
    // After a slightly longer timeout, force a route decision regardless of auth state
    const decisionTimeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("ProtectedRoute: Authentication took too long - forcing route decision");
        setForceDecision(true);
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(decisionTimeoutId);
    };
  }, [isLoading]);

  // Debug logging to help trace auth issues
  useEffect(() => {
    console.log("ProtectedRoute state:", { 
      isLoading, 
      forcedTimeout, 
      forceDecision, 
      userExists: !!user, 
      userRole, 
      currentPath: location.pathname 
    });
  }, [isLoading, forcedTimeout, forceDecision, user, userRole, location.pathname]);
  
  // Force a decision if loading takes too long
  if (forceDecision && isLoading) {
    console.log("ProtectedRoute: Forcing authentication decision");
    // Check if we have fallback data that indicates the user is logged in
    const storedTestUser = localStorage.getItem("testUser");
    
    // If there's a test user in local storage, we'll proceed
    if (storedTestUser) {
      console.log("ProtectedRoute: Found stored test user, allowing access");
      return <>{children}</>;
    }
    
    // Otherwise redirect to login
    console.log("ProtectedRoute: No fallback auth data, redirecting to login");
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Only show loading spinner for a reasonable time
  if (isLoading && !forcedTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-learnable-purple" />
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // After timeout, make a decision based on current auth state
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
