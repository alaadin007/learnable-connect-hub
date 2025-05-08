
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to invoke Supabase Edge Functions with proper authentication
 * @param functionName The name of the edge function to invoke
 * @param payload The payload to send to the function
 * @returns The response from the edge function
 */
export async function invokeEdgeFunction<T = any>(functionName: string, payload?: any): Promise<T> {
  try {
    // Check if we have an active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      throw new Error("Authentication error");
    }
    
    if (!session) {
      console.warn("No active session when invoking edge function");
      // We'll still try the function call, as some functions might work with anonymous access
    }
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });
    
    if (error) {
      console.error(`Error invoking ${functionName}:`, error);
      throw error;
    }
    
    return data as T;
  } catch (error) {
    console.error(`Failed to invoke ${functionName}:`, error);
    throw error;
  }
}

/**
 * Checks if a user is currently authenticated with Supabase
 * @returns Boolean indicating if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

/**
 * Helper to get the current user's authentication token
 * @returns The current JWT token or null if not authenticated
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}
