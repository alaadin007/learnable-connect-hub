
import { supabase } from "@/integrations/supabase/client";

/**
 * Function to completely remove a user from the database
 * @param email The email address of the user to remove
 * @returns Promise with the result of the operation
 */
export const removeUserByEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Call our edge function to remove the user
    const { data, error } = await supabase.functions.invoke("remove-user", {
      body: { email },
    });

    if (error) {
      console.error("Error removing user:", error);
      return { 
        success: false, 
        message: `Failed to remove user: ${error.message}` 
      };
    }

    return { 
      success: true, 
      message: `User ${email} has been completely removed from the database.` 
    };
  } catch (error: any) {
    console.error("Error in removeUserByEmail:", error);
    return { 
      success: false, 
      message: `An unexpected error occurred: ${error.message}` 
    };
  }
};
