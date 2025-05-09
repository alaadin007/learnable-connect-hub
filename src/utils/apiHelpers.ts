
import { supabase } from "@/integrations/supabase/client";

/**
 * Check the current session status for debugging authentication issues
 * @returns The current session information or error message
 */
export const checkSessionStatus = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error checking session status:", error);
      return { error: error.message };
    }
    
    console.log("Current session data:", data);
    
    return {
      session: data.session ? {
        expires_at: data.session.expires_at,
        user: data.session.user ? {
          id: data.session.user.id,
          email: data.session.user.email,
          role: data.session.user.role,
          user_metadata: data.session.user.user_metadata,
        } : null
      } : null
    };
  } catch (error) {
    console.error("Exception checking session:", error);
    return { error: "Failed to check session status" };
  }
};

/**
 * Test connection to Supabase to ensure API is working
 * @returns Success status and connection details
 */
export const testSupabaseConnection = async () => {
  try {
    // Simple query to test connection
    const { data, error } = await supabase.from('profiles').select('count(*)', { count: 'exact' }).limit(0);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      message: "Successfully connected to Supabase"
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to connect to Supabase" 
    };
  }
};
