import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

// Types
interface EdgeFunctionResponse<T = any> {
  data: T;
  error: Error | null;
}

interface EdgeFunctionOptions {
  requireAuth?: boolean;
  retryCount?: number;
  timeout?: number;
}

interface NetworkStatus {
  isOnline: boolean;
  lastChecked: Date;
}

// Constants
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const RETRY_DELAY = 1000; // 1 second

/**
 * Helper function to invoke Supabase Edge Functions with proper authentication and CORS handling
 * @param functionName The name of the edge function to invoke
 * @param payload The payload to send to the function
 * @param options Additional options for the function invocation
 * @returns The response from the edge function
 * @throws Error if the function invocation fails
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string, 
  payload?: any,
  options: EdgeFunctionOptions = {}
): Promise<T> {
  const {
    requireAuth = true,
    retryCount = DEFAULT_RETRY_COUNT,
    timeout = DEFAULT_TIMEOUT
  } = options;

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < retryCount) {
    try {
      // Check network status
      if (!navigator.onLine) {
        throw new Error("No internet connection");
      }

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Validate authentication if required
      if (requireAuth && !session?.access_token) {
        throw new Error("Authentication required");
      }

      // Prepare headers
      const headers = await prepareHeaders(session);
      
      // Log request details
      logRequestDetails(functionName, headers, payload);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Invoke the function with proper options formatting
      const response = await supabase.functions.invoke<T>(functionName, {
        body: payload,
        headers
      });

      clearTimeout(timeoutId);

      if (response.error) {
        throw response.error;
      }

      // Log success
      console.log(`Successfully invoked ${functionName}`);
      return response.data;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Log error details
      logErrorDetails(functionName, lastError, attempts);

      // Check if we should retry
      if (shouldRetry(lastError, attempts, retryCount)) {
        attempts++;
        await delay(RETRY_DELAY * attempts); // Exponential backoff
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error(`Failed to invoke ${functionName} after ${retryCount} attempts`);
}

/**
 * Gets the user's role with a fallback to user_type from profile if roles are not available
 * @returns The user's role or null if not found
 */
export async function getUserRoleWithFallback(): Promise<string | null> {
  try {
    // First try to get the session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) return null;
    
    // Try to get role from user_roles table
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    if (roles && roles.length > 0) {
      return roles[0].role;
    }
    
    // Fallback to checking profile user_type
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single();
    
    return profile?.user_type || null;
    
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

/**
 * Checks if a user is currently authenticated with Supabase
 * @returns Boolean indicating if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const isAuth = !!session;
    
    // Log authentication status
    console.log("Authentication check:", {
      isAuthenticated: isAuth,
      timestamp: new Date().toISOString(),
      userId: session?.user?.id
    });
    
    return isAuth;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

/**
 * Gets the current session if available
 * @returns The current session or null
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

// Helper functions to enhance edge function calls
async function prepareHeaders(session: Session | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Origin": window.location.origin,
    "Content-Type": "application/json"
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  // Add additional client info for better debugging
  headers["x-client-info"] = `${navigator.userAgent}`;

  return headers;
}

function logRequestDetails(
  functionName: string, 
  headers: Record<string, string>, 
  payload?: any
): void {
  console.log(`Sending request to edge function: ${functionName}`, {
    hasHeaders: Object.keys(headers).length,
    headersProvided: Object.keys(headers),
    hasPayload: !!payload,
    payloadSize: payload ? JSON.stringify(payload).length : 0,
    origin: window.location.origin,
    connectionStatus: navigator.onLine ? "Online" : "Offline",
    timestamp: new Date().toISOString()
  });
}

function logErrorDetails(
  functionName: string, 
  error: Error, 
  attempt: number
): void {
  console.error(`Error invoking ${functionName} (attempt ${attempt + 1}):`, {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
}

function shouldRetry(error: Error, attempts: number, maxRetries: number): boolean {
  // Don't retry if we've reached max attempts
  if (attempts >= maxRetries) return false;

  // Don't retry authentication errors
  if (error.message === "Authentication required") return false;

  // Don't retry network errors if offline
  if (error.message === "No internet connection") return false;

  // Retry other errors
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Network status monitoring
let networkStatus: NetworkStatus = {
  isOnline: navigator.onLine,
  lastChecked: new Date()
};

window.addEventListener('online', () => {
  networkStatus = {
    isOnline: true,
    lastChecked: new Date()
  };
  console.log('Network status: Online');
});

window.addEventListener('offline', () => {
  networkStatus = {
    isOnline: false,
    lastChecked: new Date()
  };
  console.log('Network status: Offline');
});

// Export network status getter
export function getNetworkStatus(): NetworkStatus {
  return { ...networkStatus };
}
