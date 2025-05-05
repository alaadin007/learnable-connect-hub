
import { supabase } from "@/integrations/supabase/client";

/**
 * Save an API key for a user
 */
export const saveApiKey = async (provider: string, apiKey: string) => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    
    // Store the API key in localStorage temporarily
    // In a production environment, this should be stored in a secure database table
    localStorage.setItem(`apiKey_${provider}_${user.id}`, apiKey);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error saving API key:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
};

/**
 * Remove an API key for a user
 */
export const removeApiKey = async (provider: string) => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    
    // Remove API key from localStorage
    localStorage.removeItem(`apiKey_${provider}_${user.id}`);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error removing API key:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
};

/**
 * Check if a user has an API key for a provider
 */
export const checkApiKey = async (provider: string) => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { exists: false, error: "Not authenticated" };
    }
    
    // Check for API key in localStorage
    const apiKey = localStorage.getItem(`apiKey_${provider}_${user.id}`);
    
    return { exists: !!apiKey, error: null };
  } catch (error: any) {
    console.error("Error checking API key:", error);
    return { exists: false, error: error.message || "An unexpected error occurred" };
  }
};
