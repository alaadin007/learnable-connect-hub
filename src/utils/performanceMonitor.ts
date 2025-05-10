
/**
 * Performance monitoring utilities
 */

// Track and report component render times
export function trackComponentRender(componentName: string): () => void {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log performance data
    console.log(`[Performance] ${componentName} rendered in ${Math.round(duration)}ms`);
    
    // Report to analytics if needed
    // reportPerformanceMetric(componentName, duration);
    
    // Report to performance observer
    if (window.PerformanceObserver) {
      const metric = {
        name: `render-${componentName.toLowerCase().replace(/\s+/g, '-')}`,
        startTime,
        duration,
        entryType: 'measure',
      };
      
      // Create a performance measure
      performance.measure(
        `render-${componentName}`,
        {
          start: startTime,
          end: endTime,
        }
      );
    }
  };
}

// Track API calls
export function trackApiCall(endpoint: string): () => void {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    console.log(`[API] ${endpoint} completed in ${Math.round(duration)}ms`);
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

// Initialize all performance monitoring
export function initPerformanceMonitoring(): () => void {
  const cleanup1 = setupLongTaskMonitoring();
  const cleanup2 = monitorLayoutShifts();
  
  // Mark initial app load
  performance.mark('app-loaded');
  
  return () => {
    cleanup1();
    cleanup2();
  };
}
