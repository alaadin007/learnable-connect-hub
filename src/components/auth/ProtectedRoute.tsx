
import React from "react";
import { Navigate } from "react-router-dom";
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

  // Show a nice loading spinner while authentication is being checked
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

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role requirements if specified
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check allowed roles if specified
  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check supervisor requirement if specified
  if (requireSupervisor && !isSuperviser) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check school requirement if specified
  if (requireSameSchool && !schoolId) {
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authorized, render children
  return <>{children}</>;
};

export default ProtectedRoute;
