
import { supabase } from "@/integrations/supabase/client";

interface FunctionOptions {
  requireAuth?: boolean;
  retryCount?: number;
  timeout?: number;
}

const defaultOptions: FunctionOptions = {
  requireAuth: true,
  retryCount: 1,
  timeout: 10000,
};

/**
 * Invoke a Supabase Edge Function with typed response
 */
export async function invokeEdgeFunction<T>(
  functionName: string,
  payload: Record<string, any>,
  options?: FunctionOptions
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let attempts = 0;

  while (attempts <= (opts.retryCount || 0)) {
    try {
      console.log(`Invoking edge function: ${functionName} (attempt ${attempts + 1})`);

      // Get the current session token if authentication is required
      let headers = {};
      if (opts.requireAuth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.error('No authentication token available');
          throw new Error('Authentication required but no token available');
        }
      }

      // Set up the function invocation with timeout
      const functionPromise = supabase.functions.invoke<{ data: T }>(functionName, {
        body: payload,
      });

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Function invocation timed out after ${opts.timeout}ms`)), opts.timeout);
      });

      // Race the function invocation against the timeout
      const response = await Promise.race([functionPromise, timeoutPromise]) as { data: T; error: { message: string } | null };
      
      if ('error' in response && response.error) {
        console.error(`Error invoking ${functionName}:`, response.error);
        throw new Error(response.error.message || `Error invoking ${functionName}`);
      }

      if (!('data' in response) || response.data === null) {
        console.error(`Invalid response from ${functionName}:`, response);
        throw new Error(`Invalid response from ${functionName}`);
      }

      return response.data as unknown as T;
    } catch (error) {
      attempts++;
      console.error(`Function invocation failed (attempt ${attempts}):`, error);
      
      // If we've reached max retries, throw the error
      if (attempts > (opts.retryCount || 0)) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 10000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error(`Failed to invoke ${functionName} after ${opts.retryCount} retries`);
}

/**
 * Helper function to get user role with fallback to localStorage
 * Enhanced to ensure school admin roles are properly detected
 */
export function getUserRoleWithFallback(): string | null {
  // Get from localStorage since we're ensuring this is kept up to date in AuthContext
  const storedRole = localStorage.getItem('userRole');
  
  if (storedRole && ['school', 'school_admin', 'teacher', 'student'].includes(storedRole)) {
    return storedRole;
  }
  
  return null;
}

/**
 * Helper function to get school ID with fallback to localStorage
 */
export function getSchoolIdWithFallback(): string | null {
  const storedSchoolId = localStorage.getItem('schoolId');
  return storedSchoolId;
}

/**
 * Helper function to check if a user has school admin privileges
 */
export function isSchoolAdmin(role: string | null): boolean {
  return role === 'school' || role === 'school_admin';
}

