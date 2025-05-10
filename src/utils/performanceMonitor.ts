
/**
 * Performance monitoring utilities for tracking page loads, 
 * component rendering, and authentication events
 */

const DEBUG_PERFORMANCE = process.env.NODE_ENV === 'development';

/**
 * Initialize performance monitoring
 * @returns A cleanup function
 */
export function initPerformanceMonitoring(): () => void {
  // Create a performance observer to monitor page loads and navigation
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (DEBUG_PERFORMANCE) {
        console.log(`[Performance] ${entry.name}: ${Math.round(entry.duration)}ms`);
      }
    }
  });

  // Start observing various performance entry types
  observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
  
  // Track authentication events
  trackAuthEvents();

  // Return cleanup function
  return () => observer.disconnect();
}

/**
 * Track auth events to debug authentication issues
 */
function trackAuthEvents(): void {
  try {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      // Monitor auth-related localStorage values
      if (key === 'userRole' || key === 'schoolId' || key === 'sb-' || key.includes('supabase')) {
        if (DEBUG_PERFORMANCE) {
          console.log(`[Auth] Setting ${key} in localStorage`);
        }
      }
      originalSetItem.apply(this, arguments as any);
    };
    
    // Log when localStorage items are removed
    const originalRemoveItem = localStorage.removeItem;
    localStorage.removeItem = function(key) {
      if (key === 'userRole' || key === 'schoolId' || key === 'sb-' || key.includes('supabase')) {
        if (DEBUG_PERFORMANCE) {
          console.log(`[Auth] Removing ${key} from localStorage`);
        }
      }
      originalRemoveItem.apply(this, arguments as any);
    };
  } catch (error) {
    console.error("Error setting up auth tracking:", error);
  }
}

/**
 * Track component render time
 * @param componentName Name of the component being rendered
 * @returns Function to call when component is done rendering
 */
export function trackComponentRender(componentName: string): () => void {
  const startTime = performance.now();
  const markName = `${componentName}-render-start`;
  
  // Mark the start of the render
  performance.mark(markName);
  
  // Return function to call when component is done rendering
  return () => {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Only log if over 100ms to reduce noise
    if (duration > 100 || DEBUG_PERFORMANCE) {
      console.log(`[Component] ${componentName} rendered in ${duration}ms`);
    }
    
    try {
      performance.measure(`${componentName}-render`, markName);
    } catch (error) {
      // Ignore measurement errors
    }
  };
}

/**
 * Preload a route for faster navigation
 * @param route Route path to preload
 */
export function preloadRoute(route: string): void {
  // This is a simple preload implementation
  // In a more complex app, this would preload 
  // the actual component bundle
  try {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    link.as = 'document';
    document.head.appendChild(link);
    
    if (DEBUG_PERFORMANCE) {
      console.log(`[Preload] Prefetching route: ${route}`);
    }
  } catch (error) {
    // Ignore preload errors
  }
}
