
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Remove a user by their email address
 * This can only be performed by school admins (supervisors)
 */
export const removeUserByEmail = async (email: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    if (!email) {
      return { 
        success: false, 
        message: "Email address is required" 
      };
    }

    // Call the edge function to remove the user
    const { data, error } = await supabase.functions.invoke("remove-user", {
      body: { email }
    });

    if (error) {
      console.error("Error removing user:", error);
      return { 
        success: false, 
        message: error.message || "Failed to remove user" 
      };
    }

    return {
      success: true,
      message: data.message || "User successfully removed"
    };
  } catch (error: any) {
    console.error("Error in removeUserByEmail:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred"
    };
  }
};

/**
 * Get the current user's school ID
 * Handles fallbacks and provides a consistent way to get the school ID
 */
export const getUserSchoolId = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc("get_user_school_id");
    
    if (error) {
      console.error("Error getting school ID:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getUserSchoolId:", error);
    return null;
  }
};

/**
 * Check if current user is a supervisor
 */
export const isUserSupervisor = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc("is_supervisor");
    
    if (error) {
      console.error("Error checking if user is supervisor:", error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error("Error in isUserSupervisor:", error);
    return false;
  }
};
