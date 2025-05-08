
import { supabase } from "@/integrations/supabase/client";

export const checkEmailExistingRole = async (email: string): Promise<string | null> => {
  try {
    // Try to get the user's role from the profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('email', email)
      .limit(1);
    
    if (error) {
      console.error("Error checking user role:", error);
      return null;
    }
    
    if (data && data.length > 0 && data[0].user_type) {
      // Return the role name with proper capitalization for display
      const role = data[0].user_type;
      switch (role) {
        case 'school':
        case 'school_admin':
          return 'School Administrator';
        case 'teacher':
        case 'teacher_supervisor':
          return 'Teacher';
        case 'student':
          return 'Student';
        default:
          return role.charAt(0).toUpperCase() + role.slice(1);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error checking email role:", error);
    return null;
  }
};

export const checkIfEmailExists = async (email: string): Promise<boolean> => {
  try {
    // Check if the email exists directly using supabase auth
    const { data, error } = await supabase.rpc('check_if_email_exists', { input_email: email });
    
    if (error) {
      console.error("Error checking email existence:", error);
      // Fallback to trying a sign-in attempt to check if the email exists
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: "dummy-password-for-check-only",
      });

      // If there's no error or the error is not about invalid credentials, email might exist
      return !signInError || (signInError && !signInError.message.includes("Invalid login credentials"));
    }
    
    return !!data;
  } catch (error) {
    console.error("Error checking email existence:", error);
    // In case of error, safer to assume it might exist
    return true;
  }
};
