
import React, { useEffect, useState } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  const { user, userRole, isSupervisor, schoolId, isLoading, isTestUser, refreshProfile } = useAuth();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  
  // Effect to verify user access
  useEffect(() => {
    const verifyAccess = async () => {
      if (isLoading) {
        return; // Wait until auth is loaded
      }
      
      // For test users, bypass all permission checks
      if (isTestUser) {
        console.log(`Test user with role ${userRole} accessing area. All permissions granted for testing.`);
        setHasAccess(true);
        setIsVerifying(false);
        return;
      }
      
      // If no user, no access
      if (!user) {
        console.log("ProtectedRoute: No user detected, access denied");
        setHasAccess(false);
        setIsVerifying(false);
        return;
      }

      try {
        // Perform a real-time check against the database 
        // This ensures we have the most up-to-date role information
        if (requiredRole || allowedRoles) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          
          const currentRole = profile?.user_type || null;
          
          // Check role requirements
          if (requiredRole && currentRole !== requiredRole) {
            console.log(`Access denied: Required role ${requiredRole}, user has ${currentRole}`);
            setHasAccess(false);
            setIsVerifying(false);
            return;
          }
          
          // Check allowed roles
          if (allowedRoles && allowedRoles.length > 0 && (!currentRole || !allowedRoles.includes(currentRole))) {
            console.log(`Access denied: User role ${currentRole} not in allowed roles [${allowedRoles.join(", ")}]`);
            setHasAccess(false);
            setIsVerifying(false);
            return;
          }
          
          // If cached role doesn't match db role, refresh the profile
          if (currentRole && userRole !== currentRole) {
            console.log(`Cached role (${userRole}) doesn't match database role (${currentRole}), refreshing profile`);
            refreshProfile();
          }
        }

        // Check supervisor requirement
        if (requireSupervisor) {
          // Real-time check for supervisor status
          const { data: teacherData, error: teacherError } = await supabase
            .from('teachers')
            .select('is_supervisor')
            .eq('id', user.id)
            .single();
            
          if (teacherError) {
            console.log("Access denied: Error checking supervisor status");
            setHasAccess(false);
            setIsVerifying(false);
            return;
          }
          
          if (!teacherData?.is_supervisor) {
            console.log("Access denied: Supervisor privileges required");
            setHasAccess(false);
            setIsVerifying(false);
            return;
          }
        }

        // Check school requirement
        if (requireSameSchool && !schoolId) {
          console.log("Access denied: School association required");
          setHasAccess(false);
          setIsVerifying(false);
          return;
        }
        
        // If we get here, user has access
        setHasAccess(true);
        setIsVerifying(false);
        
      } catch (error) {
        console.error("Error in access verification:", error);
        toast.error("Failed to verify access permissions");
        setHasAccess(false);
        setIsVerifying(false);
      }
    };

    verifyAccess();
  }, [user, userRole, requiredRole, allowedRoles, requireSupervisor, requireSameSchool, isLoading, isTestUser, schoolId, refreshProfile]);
  
  // During initial load or verification, show a loading indicator
  if (isLoading || isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Verifying permissions...</p>
        </div>
      </div>
    );
  }
  
  // If user doesn't have access, redirect
  if (!hasAccess) {
    // For unauthorized users, redirect to login if not logged in, or unauthorized if logged in
    const redirectPath = user ? "/unauthorized" : redirectTo;
    console.log(`Redirecting to ${redirectPath} due to insufficient permissions`);
    return <Navigate to={redirectPath} replace state={{ from: location.pathname }} />;
  }

  // User is authorized, render children or Outlet
  return <>{children || <Outlet />}</>;
};

export default ProtectedRoute;
