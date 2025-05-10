
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
    'abort'
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
  initialDelay: number = 1000
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
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}
