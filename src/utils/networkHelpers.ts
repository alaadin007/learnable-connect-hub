
/**
 * Utility functions for handling network-related operations
 */

/**
 * Check if the device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: Error | unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  const networkErrorPatterns = [
    'failed to fetch',
    'network request failed',
    'network error',
    'cannot connect',
    'internet connection',
    'timeout exceeded',
    'aborted',
    'abort',
    'connection refused',
    'ECONNREFUSED',
    'socket hang up',
    'ETIMEDOUT'
  ];
  
  return networkErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!isNetworkError(error) || retries >= maxRetries) {
        throw error;
      }
      
      retries++;
      
      // Call onRetry callback if provided
      if (onRetry && error instanceof Error) {
        onRetry(retries, error);
      }
      
      // Wait for the calculated delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff with jitter
      delay = Math.min(delay * 2, 10000) * (0.8 + Math.random() * 0.4);
    }
  }
}

/**
 * Creates a promise that rejects after a specified timeout
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
}

/**
 * Execute a function with a timeout
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  return Promise.race([
    fn(),
    createTimeout(timeoutMs)
  ]);
}

// Interface for enhanced RequestInit to include query parameters
interface EnhancedRequestInit extends RequestInit {
  query?: Record<string, string>;
}

/**
 * Optimized fetch function with reliability features
 * - Adds timeout handling
 * - Implements retry with backoff
 * - Handles connection errors gracefully
 * - Caches responses for improved performance
 */
export async function fetchWithReliability<T>(
  url: string, 
  options: EnhancedRequestInit = {}, 
  retries: number = 3,
  timeout: number = 8000,
  cacheKey?: string
): Promise<T> {
  // Check for cached response if cacheKey is provided
  if (cacheKey) {
    const cached = sessionStorage.getItem(`fetch_cache:${cacheKey}`);
    if (cached) {
      try {
        const { data, expiry } = JSON.parse(cached);
        // Use cache if it hasn't expired
        if (expiry > Date.now()) {
          return data as T;
        }
        // Remove expired cache
        sessionStorage.removeItem(`fetch_cache:${cacheKey}`);
      } catch (e) {
        // Invalid cache format, continue with fetch
        console.warn("Invalid cache format, fetching fresh data");
      }
    }
  }

  // Add abort controller for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Handle query parameters and append them to the URL
    let finalUrl = url;
    if (options.query) {
      const queryParams = new URLSearchParams();
      Object.entries(options.query).forEach(([key, value]) => {
        queryParams.append(key, value);
      });
      finalUrl = `${url}?${queryParams.toString()}`;
      // Remove query from options to avoid TypeScript error
      delete options.query;
    }

    // Add the signal to the options
    const fetchOptions = {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.headers || {}),
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };

    // Use retry with backoff
    const result = await retryWithBackoff(
      async () => {
        const response = await fetch(finalUrl, fetchOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        return await response.json();
      },
      retries,
      1000
    );

    // Cache the result if cacheKey is provided
    if (cacheKey) {
      try {
        // Cache for 5 minutes by default
        const cacheData = {
          data: result,
          expiry: Date.now() + 5 * 60 * 1000
        };
        sessionStorage.setItem(`fetch_cache:${cacheKey}`, JSON.stringify(cacheData));
      } catch (e) {
        console.warn("Failed to cache response", e);
      }
    }

    return result as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Clear the fetch cache for a specific key or all keys
 */
export function clearFetchCache(cacheKey?: string): void {
  if (cacheKey) {
    sessionStorage.removeItem(`fetch_cache:${cacheKey}`);
  } else {
    // Clear all fetch cache items
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('fetch_cache:')) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

/**
 * Get cached data if available
 */
export function getCachedData<T>(cacheKey: string): T | null {
  const cached = sessionStorage.getItem(`fetch_cache:${cacheKey}`);
  if (cached) {
    try {
      const { data, expiry } = JSON.parse(cached);
      if (expiry > Date.now()) {
        return data as T;
      }
    } catch (e) {
      // Invalid format or expired
      return null;
    }
  }
  return null;
}

/**
 * Generate a stable unique ID from data input rather than random UUIDs
 * for consistent client-side IDs
 */
export function generateStableId(input: string): string {
  // Simple hash function for strings
  let hash = 0;
  if (input.length === 0) return hash.toString(36);
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to alphanumeric and add timestamp to ensure uniqueness
  return `id-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;
}
