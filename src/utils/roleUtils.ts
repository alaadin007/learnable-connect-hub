
import { AppRole } from "@/contexts/RBACContext";

// Convert from user_type to app_role for backwards compatibility
export const userTypeToRole = (userType: string): AppRole | null => {
  switch (userType) {
    case 'school':
      return 'school_admin';
    case 'teacher':
      return 'teacher';
    case 'student':
      return 'student';
    default:
      return null;
  }
};

// Get a display name for a role
export const getRoleDisplayName = (role: AppRole): string => {
  switch (role) {
    case 'school_admin':
      return 'School Administrator';
    case 'teacher_supervisor':
      return 'Teacher Supervisor';
    case 'teacher':
      return 'Teacher';
    case 'student':
      return 'Student';
    case 'system_admin':
      return 'System Administrator';
    default:
      return role;
  }
};

// Get an array of all possible roles
export const getAllRoles = (): AppRole[] => {
  return ['school_admin', 'teacher_supervisor', 'teacher', 'student', 'system_admin'];
};

// Get roles that can be managed by a specific role
export const getManageableRoles = (role: AppRole): AppRole[] => {
  switch (role) {
    case 'system_admin':
      return getAllRoles();
    case 'school_admin':
      return ['teacher_supervisor', 'teacher', 'student'];
    case 'teacher_supervisor':
      return ['teacher', 'student'];
    default:
      return [];
  }
};
