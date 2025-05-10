/**
 * Performance monitoring utilities
 */

// Track and report component render times
export function trackComponentRender(componentName: string): () => void {
  const startTime = performance.now();
  const navigationStart = window.performance.timing?.navigationStart || 0;
  const pageLoadTime = startTime - navigationStart;
  
  // Log immediately for first-paint metrics
  if (pageLoadTime < 10000) { // Only log if it's a reasonable number
    console.log(`[Performance] Initial page load: ${Math.round(pageLoadTime)}ms`);
  }
  
  // Mark the start of this component's render
  performance.mark(`${componentName}-start`);
  
  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Mark end and measure
    performance.mark(`${componentName}-end`);
    performance.measure(
      `render-${componentName}`,
      `${componentName}-start`,
      `${componentName}-end`
    );
    
    // Log performance data
    console.log(`[Performance] ${componentName} rendered in ${Math.round(duration)}ms`);
    
    // Create a performance measure
    if (window.PerformanceObserver) {
      const metric = {
        name: `render-${componentName.toLowerCase().replace(/\s+/g, '-')}`,
        startTime,
        duration,
        entryType: 'measure',
      };
    }
  };
}

// Track API calls with timeout detection
export function trackApiCall(endpoint: string, timeoutThreshold = 1000): () => void {
  const startTime = performance.now();
  const timeoutId = setTimeout(() => {
    console.warn(`[API] Request to ${endpoint} is taking longer than ${timeoutThreshold}ms`);
  }, timeoutThreshold);
  
  return () => {
    clearTimeout(timeoutId);
    const duration = performance.now() - startTime;
    console.log(`[API] ${endpoint} completed in ${Math.round(duration)}ms`);
    
    // Report slow API calls
    if (duration > timeoutThreshold) {
      console.warn(`[API] Slow request to ${endpoint}: ${Math.round(duration)}ms`);
    }
  };
}

// Monitor long tasks
export function setupLongTaskMonitoring(): () => void {
  if (!('PerformanceObserver' in window)) return () => {};
  
  // Track long tasks that block the main thread
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      // Long tasks are operations that block the main thread for more than 50ms
      console.warn(`[Performance] Long task detected: ${Math.round(entry.duration)}ms`);
    });
  });
  
  observer.observe({ entryTypes: ['longtask'] });
  
  return () => observer.disconnect();
}

// Monitor layout shifts
export function monitorLayoutShifts(): () => void {
  if (!('PerformanceObserver' in window)) return () => {};
  
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry: any) => {
      // Report significant layout shifts (CLS events)
      if (entry.value > 0.1) {
        console.warn(`[Performance] Layout shift detected: ${entry.value.toFixed(3)}`);
      }
    });
  });
  
  observer.observe({ entryTypes: ['layout-shift'] });
  
  return () => observer.disconnect();
}

// Initialize performance monitoring and return cleanup function
export function initPerformanceMonitoring(): () => void {
  // Mark initial page load time
  const loadTime = performance.now();
  console.log(`[Performance] App loaded in ${Math.round(loadTime)}ms`);
  performance.mark('app-loaded');
  
  // Setup monitoring
  const cleanup1 = setupLongTaskMonitoring();
  const cleanup2 = monitorLayoutShifts();
  
  // Add interaction tracking
  document.addEventListener('click', () => {
    performance.mark('user-interaction');
  });
  
  return () => {
    cleanup1();
    cleanup2();
  };
}

// Add preload capabilities
export function preloadRoute(path: string): void {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = path;
  document.head.appendChild(link);
}
