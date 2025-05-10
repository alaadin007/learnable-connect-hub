
/**
 * Check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // Check for common network error patterns
  return (
    (typeof error.message === 'string' && (
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network Error') ||
      error.message.includes('network') ||
      error.message.includes('offline') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('timeout')
    )) ||
    error.name === 'NetworkError' ||
    error.name === 'AbortError' ||
    (typeof error.code === 'string' && (
      error.code === 'ECONNABORTED' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND'
    ))
  );
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param baseDelay Base delay in milliseconds
 * @returns Promise that resolves when the function succeeds or rejects after max retries
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 300
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isNetworkError(error)) {
        // If it's not a network error, don't retry
        throw error;
      }
      
      // Calculate exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      // Add some jitter to prevent all clients from retrying at the same time
      const jitter = Math.random() * 200;
      
      console.log(`Attempt ${attempt + 1} failed, retrying in ${Math.round((delay + jitter) / 100) / 10}s...`);
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

/**
 * Execute a function with a timeout
 * @param fn Function to execute
 * @param timeout Timeout in milliseconds
 * @returns Promise that resolves with the function result or rejects with a timeout error
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number = 5000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
    })
  ]);
}

