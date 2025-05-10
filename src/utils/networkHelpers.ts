
import { toast } from 'sonner';

/**
 * Check if an error is a network error
 * @param error Any error object
 * @returns True if this appears to be a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Check for common network error messages
  const errorMessage = error.message ? error.message.toLowerCase() : '';
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('connection refused') ||
    errorMessage.includes('network request failed') ||
    error.name === 'NetworkError' ||
    error.name === 'AbortError' ||
    // Safari may throw SecurityError on CORS issues
    (error.name === 'SecurityError' && 
     errorMessage.includes('cross-origin'))
  );
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in ms
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 500
): Promise<T> {
  let retries = 0;
  let lastError: any;
  
  while (retries <= maxRetries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      
      // Only retry on network errors or 500-level server errors
      const isRetryable = isNetworkError(err) || 
        (err.status && err.status >= 500 && err.status < 600);
      
      if (!isRetryable || retries >= maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, retries) + 
        Math.floor(Math.random() * 100);
      
      console.warn(`Retry ${retries + 1}/${maxRetries} in ${delay}ms due to:`, err);
      
      // Wait for the delay
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      retries++;
    }
  }
  
  throw lastError;
}

/**
 * Execute a function with a timeout
 * @param fn Function to execute
 * @param timeout Timeout in ms
 * @returns Result of the function
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number = 5000
): Promise<T> {
  return new Promise<T>(async (resolve, reject) => {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, timeoutReject) => 
      setTimeout(() => timeoutReject(new Error('Operation timed out')), timeout)
    );
    
    try {
      // Race the function against the timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      resolve(result);
    } catch (error) {
      console.error('Operation failed or timed out:', error);
      // Show a user-friendly toast for timeouts
      if (error.message === 'Operation timed out') {
        toast.error('Operation timed out', {
          description: 'The request took too long to complete. Please try again.'
        });
      }
      reject(error);
    }
  });
}

/**
 * Check and handle network connection status
 * @returns True if online, false otherwise
 */
export function checkNetworkConnection(): boolean {
  const isOnline = navigator.onLine;
  
  if (!isOnline) {
    toast.error('You are offline', {
      description: 'Please check your internet connection and try again.'
    });
  }
  
  return isOnline;
}
