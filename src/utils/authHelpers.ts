
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppRole } from "@/contexts/RBACContext";

/**
 * Assigns a role to a user in the database
 * @param userId User ID
 * @param role Role to assign
 * @returns Promise<void>
 */
export const assignUserRole = async (userId: string, role: AppRole): Promise<void> => {
  try {
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error assigning user role:', error);
    throw error;
  }
};

/**
 * Handles registration errors and displays appropriate toast messages
 * @param error Error object
 */
export const handleRegistrationError = (error: any): void => {
  console.error('Registration error:', error);
  
  const errorMessage = error.message || 'Registration failed. Please try again.';
  
  if (errorMessage.includes('email')) {
    toast.error('Email error', { description: errorMessage });
  } else if (errorMessage.includes('password')) {
    toast.error('Password error', { description: errorMessage });
  } else if (errorMessage.includes('check constraint')) {
    toast.error('Registration failed', { 
      description: 'There was an issue with the user type provided. Please contact support.' 
    });
  } else if (errorMessage.includes('school')) {
    toast.error('School registration error', { 
      description: 'There was an issue with the school information provided.' 
    });
  } else {
    toast.error('Registration failed', { description: errorMessage });
  }
};

/**
 * Register a new user with Supabase authentication
 * @param email User email
 * @param password User password
 * @param userData Additional user metadata
 * @returns Object containing the auth data and any error
 */
export const registerUser = async (
  email: string,
  password: string,
  userData: Record<string, any>
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: `${window.location.origin}/login?email_confirmed=true`,
      },
    });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Re-export functions from other helpers for backward compatibility
export { 
  checkEmailExists, 
  createUserProfile, 
  sendPasswordResetEmail, 
  updateUserPassword, 
  validateUserType 
} from './userHelpers';

export { 
  validateSchoolCode,
  generateSchoolCode,
  createSchoolCode,
  createSchool
} from './schoolHelpers';
