
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "school_admin" | "teacher_supervisor" | "teacher" | "student" | "system_admin";

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
  const { user, isLoading: authLoading, userRole } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRoles = async () => {
    // Fast path for test accounts
    const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
    const testAccountRoles = localStorage.getItem('testAccountRoles');
    
    if (usingTestAccount && testAccountRoles) {
      try {
        const parsedRoles = JSON.parse(testAccountRoles) as AppRole[];
        setRoles(parsedRoles);
        setIsLoading(false);
        return;
      } catch (e) {
        console.error("Error parsing test account roles:", e);
      }
    }

    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // If we have a test account based on ID or email, create appropriate roles
      if (user.id.startsWith('test-') || (user.email && user.email.includes('.test@'))) {
        if (userRole === 'school' || (user.email && user.email.includes('school.test@'))) {
          setRoles(['school_admin']);
        } else if (userRole === 'teacher' || (user.email && user.email.includes('teacher.test@'))) {
          setRoles(['teacher']);
        } else if (userRole === 'student' || (user.email && user.email.includes('student.test@'))) {
          setRoles(['student']);
        } else {
          setRoles([]);
        }
        setIsLoading(false);
        return;
      }

      // For regular users, fetch roles from database
      const { data, error } = await supabase.rpc("get_user_roles");

      if (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
      } else if (Array.isArray(data)) {
        // Ensure data is an array of valid role values
        const validRoles = data.filter(role => 
          typeof role === 'string' && 
          ['school_admin', 'teacher_supervisor', 'teacher', 'student', 'system_admin'].includes(role)
        ) as AppRole[];
        
        setRoles(validRoles);
      } else {
        setRoles([]);
      }
    } catch (error) {
      console.error("Error in fetchUserRoles:", error);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchUserRoles();
    }
  }, [user, authLoading, userRole]);

  const hasRole = (role: AppRole): boolean => roles.includes(role);

  const hasAnyRole = (rolesToCheck: AppRole[]): boolean =>
    roles.some((role) => rolesToCheck.includes(role));

  // If userRole is 'school', always include school_admin role for compatibility
  const isAdmin = hasRole("school_admin") || hasRole("system_admin") || userRole === 'school';
  const isSupervisor = hasRole("teacher_supervisor") || isAdmin;
  const isTeacher = hasRole("teacher") || isSupervisor || userRole === 'teacher';
  const isStudent = hasRole("student") || userRole === 'student';

  const value = {
    roles,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSupervisor,
    isTeacher,
    isStudent,
    isLoading: authLoading || isLoading,
    refreshRoles: fetchUserRoles,
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
};

export const useRBAC = (): RBACContextType => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error("useRBAC must be used within an RBACProvider");
  }
  return context;
};
