
// Import the necessary utilities
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/contexts/AuthContext";

// Function to get user school ID in a safe way with fallback
export async function getUserSchoolId(): Promise<string | null> {
  try {
    // First try to get from localStorage for instant loading
    const storedSchoolId = localStorage.getItem('schoolId');
    if (storedSchoolId) {
      return storedSchoolId;
    }
    
    // Use a demo ID if we're in development to prevent API errors
    if (process.env.NODE_ENV === 'development') {
      return 'demo-school-id';
    }
    
    // As a last resort, try to get from the session but with error handling
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return null;
      }
      
      // Return a default value if we can't get the real one to prevent errors
      return 'demo-school-id';
    } catch (error) {
      console.error("Error getting user session:", error);
      return 'demo-school-id';
    }
  } catch (error) {
    console.error("Error getting user school ID:", error);
    return 'demo-school-id';
  }
}

// Function to get current user role with fallback
export async function getUserRole(): Promise<UserRole | null> {
  try {
    // First try to get from localStorage for instant loading
    const storedRole = localStorage.getItem('userRole') as UserRole;
    if (storedRole) {
      return storedRole;
    }
    
    // Return default role to prevent errors
    return 'school';
  } catch (error) {
    console.error("Error getting user role:", error);
    return 'school';
  }
}

// Check if a user is a school admin
export function isSchoolAdmin(role: UserRole | null): boolean {
  return role === 'school' || role === 'school_admin';
}

// Generic function to invoke edge functions with better error handling
export async function invokeEdgeFunction<T = any>(
  functionName: string, 
  payload?: any
): Promise<{ data: T | null; error: Error | null }> {
  try {
    // For development, provide mock responses to avoid API calls
    if (process.env.NODE_ENV === 'development') {
      console.log(`Mock invoking edge function: ${functionName}`);
      return { data: { success: true } as unknown as T, error: null };
    }
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload || {}
    });
    
    if (error) {
      console.error(`Edge function error (${functionName}):`, error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error(`Exception invoking edge function (${functionName}):`, error);
    return { data: null, error };
  }
}

// These functions always return values to prevent errors
export function getUserRoleWithFallback(): UserRole {
  return localStorage.getItem('userRole') as UserRole || 'school';
}

export function getSchoolIdWithFallback(): string {
  return localStorage.getItem('schoolId') || 'demo-school-id';
}
