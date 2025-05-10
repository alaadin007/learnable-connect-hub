
import { useEffect, useRef } from 'react';
import { trackComponentRender } from '@/utils/performanceMonitor';

/**
 * Hook to track page performance and component mounting
 * @param componentName Name of the component/page being monitored
 */
export function usePagePerformance(componentName: string) {
  const endTracking = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    // Start tracking render time when component mounts
    endTracking.current = trackComponentRender(componentName);
    
    return () => {
      // End tracking when component unmounts
      if (endTracking.current) {
        endTracking.current();
      }
    };
  }, [componentName]);
}
