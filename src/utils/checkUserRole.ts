
import { supabase } from "@/integrations/supabase/client";

/**
 * Function to check the role of a user by email
 * @param email The email address to check
 * @returns Promise with the user role information
 */
export const checkUserRoleByEmail = async (email: string): Promise<{
  success: boolean;
  data?: {
    email: string;
    userId: string;
    role: string;
    profile: any;
    additionalInfo: any;
  };
  error?: string;
}> => {
  try {
    // Call our edge function to check the user role
    const { data, error } = await supabase.functions.invoke("check-user-role", {
      body: { email },
    });

    if (error) {
      console.error("Error checking user role:", error);
      return { 
        success: false, 
        error: `Failed to check user role: ${error.message}` 
      };
    }

    return { 
      success: true, 
      data
    };
  } catch (error: any) {
    console.error("Error in checkUserRoleByEmail:", error);
    return { 
      success: false, 
      error: `An unexpected error occurred: ${error.message}` 
    };
  }
};
