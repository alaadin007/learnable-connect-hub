
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
    
    // Check if user already has an API key for this provider
    const { data: existingKey } = await supabase
      .from('user_api_keys')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();
    
    let result;
    
    if (existingKey) {
      // Update existing key
      result = await supabase
        .from('user_api_keys')
        .update({ api_key: apiKey, updated_at: new Date().toISOString() })
        .eq('id', existingKey.id);
    } else {
      // Insert new key
      result = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          provider,
          api_key: apiKey
        });
    }
    
    if (result.error) {
      throw result.error;
    }
    
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
    
    // Delete API key for this provider
    const { error } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider);
    
    if (error) {
      throw error;
    }
    
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
    
    // Check for API key
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();
    
    if (error) {
      throw error;
    }
    
    return { exists: !!data, error: null };
  } catch (error: any) {
    console.error("Error checking API key:", error);
    return { exists: false, error: error.message || "An unexpected error occurred" };
  }
};
