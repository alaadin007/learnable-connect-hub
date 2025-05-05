
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Define the role type based on our database enum
export type AppRole = 'school_admin' | 'teacher_supervisor' | 'teacher' | 'student' | 'system_admin';

interface RBACContextType {
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isLoading: boolean;
  refreshRoles: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const RBACProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRoles = async () => {
    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_user_roles');
      
      if (error) {
        console.error('Error fetching user roles:', error);
        setRoles([]);
      } else {
        setRoles(data || []);
      }
    } catch (error) {
      console.error('Error in fetchUserRoles:', error);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch roles when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchUserRoles();
    }
  }, [user, authLoading]);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const hasAnyRole = (rolesToCheck: AppRole[]): boolean => {
    return roles.some(role => rolesToCheck.includes(role));
  };

  // Computed properties for common role checks
  const isAdmin = hasRole('school_admin') || hasRole('system_admin');
  const isSupervisor = hasRole('teacher_supervisor') || isAdmin;
  const isTeacher = hasRole('teacher') || isSupervisor;
  const isStudent = hasRole('student');

  const value = {
    roles,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSupervisor,
    isTeacher,
    isStudent,
    isLoading: authLoading || isLoading,
    refreshRoles: fetchUserRoles
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
};

export const useRBAC = (): RBACContextType => {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};
