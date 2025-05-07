
import { AppRole } from "@/contexts/RBACContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
 * Checks if an email already exists in the Supabase auth system
 * @param email Email to check
 * @returns Boolean indicating if email exists
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    // Using check_if_email_exists instead of check_email_exists which is the correct function name
    const { data, error } = await supabase.rpc('check_if_email_exists', { input_email: email });
    
    if (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in checkEmailExists:', error);
    return false;
  }
};

/**
 * Validates a school code by checking if it exists in the database
 * @param code School code to validate
 * @returns Object containing validation status and school ID if valid
 */
export const validateSchoolCode = async (code: string): Promise<{ isValid: boolean; schoolId: string | null }> => {
  try {
    // Use the get_school_by_code function which returns the school details
    const { data, error } = await supabase.rpc('get_school_by_code', { input_code: code });
    
    if (error || !data || data.length === 0) {
      console.error('School code validation error:', error);
      return { isValid: false, schoolId: null };
    }
    
    return { isValid: true, schoolId: data[0].id };
  } catch (error) {
    console.error('Error in validateSchoolCode:', error);
    return { isValid: false, schoolId: null };
  }
};

/**
 * Creates a user profile in the database
 * @param userId User ID
 * @param email User email
 * @param userType User type/role
 * @param schoolId School ID
 * @param fullName Optional full name
 */
export const createUserProfile = async (
  userId: string,
  email: string,
  userType: string,
  schoolId: string,
  fullName?: string
): Promise<void> => {
  try {
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      email,
      user_type: userType,
      school_id: schoolId,
      full_name: fullName || email.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error creating user profile:', error);
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
  } else {
    toast.error('Registration failed', { description: errorMessage });
  }
};

/**
 * Sends a password reset email to the user
 * @param email User email
 * @returns Boolean indicating success
 */
export const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    
    return true;
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Updates a user's password
 * @param newPassword New password
 * @returns Boolean indicating success
 */
export const updateUserPassword = async (newPassword: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    
    return true;
  } catch (error: any) {
    console.error('Error updating password:', error);
    throw error;
  }
};
