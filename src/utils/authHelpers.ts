
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
    // Using the correct function name check_if_email_exists with input_email parameter
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
    // Make sure userType is a valid value accepted by the profiles table
    // Valid types likely include: 'school_admin', 'teacher', 'student'
    const validUserType = validateUserType(userType);
    
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      user_type: validUserType,
      full_name: fullName || email.split('@')[0],
      school_code: schoolId, // This might need to be updated if school_code is not the ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    if (error) {
      console.error('Profile creation error details:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Validates and normalizes user type to match database constraints
 * @param userType User type to validate
 * @returns Valid user type string
 */
const validateUserType = (userType: string): string => {
  // Normalize the user type to match expected values in the database
  const validTypes = ['school_admin', 'teacher', 'student'];
  
  // If it's already one of our valid types, return it
  if (validTypes.includes(userType)) {
    return userType;
  }
  
  // Map simplified types to valid database values
  switch(userType.toLowerCase()) {
    case 'admin':
      return 'school_admin';
    case 'teacher':
      return 'teacher';
    case 'student':
      return 'student';
    default:
      console.warn(`Unknown user type: ${userType}, defaulting to 'student'`);
      return 'student';
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
      description: 'There was an issue with the data provided. Please check your inputs and try again.' 
    });
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
