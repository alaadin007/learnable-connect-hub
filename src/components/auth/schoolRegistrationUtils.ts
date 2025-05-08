
import { supabase } from '@/integrations/supabase/client';

/**
 * Check if an email is associated with a particular user role
 * @param email The email to check
 * @returns The user role if found, null otherwise
 */
export async function checkEmailExistingRole(email: string): Promise<string | null> {
  try {
    // Explicitly define the return type to prevent deep type instantiation
    const { data, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error checking email role:', error);
      return null;
    }

    return data?.user_type || null;
  } catch (e) {
    console.error('Exception checking email role:', e);
    return null;
  }
}

/**
 * Check if an email already exists in the system
 * @param email The email to check
 * @returns Boolean indicating if the email exists
 */
export async function checkIfEmailExists(email: string): Promise<boolean> {
  try {
    // Use rpc function that's available in the database
    const { data, error } = await supabase.rpc('check_if_email_exists', {
      input_email: email  // Parameter name matches the function parameter in database
    });

    if (error) {
      console.error('Error checking if email exists:', error);
      return false;
    }

    // Explicitly cast the result to boolean to ensure type safety
    return Boolean(data);
  } catch (e) {
    console.error('Exception checking if email exists:', e);
    return false;
  }
}
