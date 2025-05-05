
import React from 'react';
import { useRBAC, AppRole } from '@/contexts/RBACContext';

interface RoleBasedContentProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  allowedRoles?: AppRole[];
  fallback?: React.ReactNode;
}

/**
 * A component that conditionally renders content based on user roles
 * 
 * @param children Content to render if user has the required role
 * @param requiredRole Specific role required to view the content
 * @param allowedRoles Array of roles allowed to view the content (user must have at least one)
 * @param fallback Optional content to show if user doesn't have the required role
 */
const RoleBasedContent: React.FC<RoleBasedContentProps> = ({
  children,
  requiredRole,
  allowedRoles,
  fallback = null
}) => {
  const { hasRole, hasAnyRole, isLoading } = useRBAC();
  
  // Don't render anything while loading
  if (isLoading) {
    return null;
  }
  
  // Check specific required role
  if (requiredRole && !hasRole(requiredRole)) {
    return <>{fallback}</>;
  }
  
  // Check if user has any of the allowed roles
  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    return <>{fallback}</>;
  }
  
  // User has the required role(s), render the children
  return <>{children}</>;
};

export default RoleBasedContent;
