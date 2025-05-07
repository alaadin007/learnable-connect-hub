
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    const validUserType = validateUserType(userType);
    
    // Query school code using school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('code')
      .eq('id', schoolId)
      .single();
    
    if (schoolError || !schoolData) {
      console.error('Error retrieving school code:', schoolError);
      throw new Error('Failed to retrieve school code');
    }
    
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      user_type: validUserType,
      full_name: fullName || email.split('@')[0],
      school_code: schoolData.code, // Use the actual school code from the schools table
      school_name: null, // This will be filled in from the schools table if needed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    if (error) {
      console.error('Profile creation error details:', error);
      throw error;
    }
    
    // Add user to the appropriate role-specific table
    if (validUserType === 'school_admin' || validUserType === 'teacher' || validUserType === 'teacher_supervisor') {
      const { error: teacherError } = await supabase.from('teachers').insert({
        id: userId,
        school_id: schoolId,
        is_supervisor: validUserType === 'school_admin' || validUserType === 'teacher_supervisor',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      if (teacherError) {
        console.error('Error creating teacher record:', teacherError);
        throw teacherError;
      }
    } else if (validUserType === 'student') {
      const { error: studentError } = await supabase.from('students').insert({
        id: userId,
        school_id: schoolId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      
      if (studentError) {
        console.error('Error creating student record:', studentError);
        throw studentError;
      }
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
export const validateUserType = (userType: string): string => {
  // Based on the updated database constraint, these types are valid
  const validTypes = ['school_admin', 'teacher', 'student', 'teacher_supervisor', 'system_admin', 'school', 'admin'];
  
  // If it's already one of our valid types, return it
  if (validTypes.includes(userType)) {
    return userType;
  }
  
  // Map simplified types to valid database values
  switch(userType.toLowerCase()) {
    case 'admin':
    case 'school':
      return 'school_admin';
    case 'teacher':
      return 'teacher';
    case 'student':
      return 'student';
    case 'supervisor':
    case 'teacher_supervisor':
      return 'teacher_supervisor';
    default:
      console.warn(`Unknown user type: ${userType}, defaulting to 'student'`);
      return 'student';
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
