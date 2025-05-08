
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to invoke Supabase Edge Functions with proper authentication
 * @param functionName The name of the edge function to invoke
 * @param payload The payload to send to the function
 * @returns The response from the edge function
 */
export async function invokeEdgeFunction<T = any>(functionName: string, payload?: any): Promise<T> {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      throw new Error("Authentication error: " + sessionError.message);
    }
    
    // Define headers - will add authorization if available
    const headers: Record<string, string> = {};
    
    // If we have a session, add the authorization header
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      // If this is a test user or special case, we can continue without auth
      console.warn("No active session found, continuing without authentication");
    }
    
    // Invoke the function with explicit authorization header if available
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers
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
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      // Try to refresh the token if not present
      const { data: refreshData } = await supabase.auth.refreshSession();
      return refreshData.session?.access_token || null;
    }
    return session.access_token;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}
