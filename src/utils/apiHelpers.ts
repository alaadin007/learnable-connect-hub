
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to invoke Supabase Edge Functions with proper authentication and CORS handling
 * @param functionName The name of the edge function to invoke
 * @param payload The payload to send to the function
 * @returns The response from the edge function
 */
export async function invokeEdgeFunction<T = any>(functionName: string, payload?: any): Promise<T> {
  try {
    console.log(`Attempting to invoke edge function: ${functionName}`);
    
    // Get the current session without waiting for refresh
    const { data: { session } } = await supabase.auth.getSession();
    
    // Define headers - will add authorization if available
    const headers: Record<string, string> = {
      "Origin": window.location.origin,
      "Content-Type": "application/json"
    };
    
    // If we have a session, add the authorization header
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
      console.log(`Found active session, using auth token for ${functionName}`);
    } else {
      console.log(`No active session found for ${functionName} invocation`);
    }
    
    // Log network request attempt
    console.log(`Sending request to edge function: ${functionName}`, { 
      hasHeaders: Object.keys(headers).length,
      hasPayload: !!payload,
      origin: window.location.origin,
      connectionStatus: navigator.onLine ? "Online" : "Offline"
    });
    
    // Invoke the function with explicit authorization header if available
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers
    });
    
    if (error) {
      console.error(`Error invoking ${functionName}:`, error);
      throw error;
    }
    
    console.log(`Successfully invoked ${functionName}`);
    return data as T;
  } catch (error) {
    console.error(`Failed to invoke ${functionName}:`, error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error(`Error details: ${error.name}, ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    throw error; // Rethrow to allow proper error handling by caller
  }
}

/**
 * Checks if a user is currently authenticated with Supabase
 * @returns Boolean indicating if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Authentication check:", !!session ? "User is authenticated" : "No active session");
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
    return session?.access_token || null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}

/**
 * Helper to check the validity of a Supabase session
 * This can be used to verify if authentication is working correctly
 * @returns Object with session status information
 */
export async function checkSessionStatus(): Promise<{
  hasSession: boolean;
  hasUser: boolean;
  userId: string | null;
  expiresAt: number | null;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log("Session details:", {
        userId: session.user.id,
        expiresAt: session.expires_at,
        provider: session.user.app_metadata.provider,
        email: session.user.email
      });
    }
    
    return {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || null,
      expiresAt: session?.expires_at || null
    };
  } catch (error) {
    console.error("Error checking session status:", error);
    return {
      hasSession: false,
      hasUser: false,
      userId: null,
      expiresAt: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Checks if a school admin account exists in the database for the specified user
 * Used as a fallback when the profile table data is unavailable
 * @param userId The user ID to check
 * @returns Boolean indicating if user is a school admin
 */
export async function checkIfSchoolAdmin(userId: string): Promise<boolean> {
  try {
    // Check if user is in teachers table with is_supervisor flag
    const { data, error } = await supabase
      .from('teachers')
      .select('is_supervisor')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error checking school admin status:", error);
      return false;
    }
    
    return data?.is_supervisor === true;
  } catch (error) {
    console.error("Exception checking school admin status:", error);
    return false;
  }
}

/**
 * Helper function to safely get the user's role from metadata or database
 * Provides fallbacks if the standard auth flow fails
 */
export async function getUserRoleWithFallback(user: any): Promise<string | null> {
  if (!user) return null;
  
  try {
    // First try getting from metadata
    if (user.user_metadata?.user_type) {
      const metaType = user.user_metadata.user_type;
      
      // Normalize school admin roles
      if (metaType === "school_admin" || metaType === "school") {
        return "school";
      }
      
      return metaType;
    }
    
    // Try fetching from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();
      
    if (profile?.user_type) {
      // Normalize school admin roles
      if (profile.user_type === "school_admin" || profile.user_type === "school") {
        return "school";
      }
      
      return profile.user_type;
    }
    
    // Check if in teachers table
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
      
    if (teacher) {
      return "teacher";
    }
    
    // Check if in students table
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
      
    if (student) {
      return "student";
    }
    
    // Last resort - check email patterns
    if (user.email) {
      if (user.email.startsWith('school') || user.email.startsWith('admin')) {
        return "school";
      } else if (user.email.startsWith('teacher')) {
        return "teacher";
      }
    }
    
    return "student"; // Default fallback
  } catch (error) {
    console.error("Error in getUserRoleWithFallback:", error);
    return null;
  }
}
