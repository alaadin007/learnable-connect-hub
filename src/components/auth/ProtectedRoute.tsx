
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'school' | 'teacher' | 'student'>;
  requireSupervisor?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requireSupervisor = false 
}: ProtectedRouteProps) => {
  const { user, profile, isSuperviser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we require specific roles and the user doesn't have one of them
  if (allowedRoles && profile && !allowedRoles.includes(profile.user_type)) {
    return <Navigate to="/dashboard" replace />;
  }

  // If we require supervisor access and the user isn't a supervisor
  if (requireSupervisor && !isSuperviser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
