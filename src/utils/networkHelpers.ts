
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
