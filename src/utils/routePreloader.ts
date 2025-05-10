
import { preloadRoute } from './performanceMonitor';

/**
 * Routes that should be preloaded for faster navigation
 */
const PRELOAD_ROUTES: Record<string, string[]> = {
  // When on the dashboard, preload these routes
  '/dashboard': [
    '/student/lectures',
    '/student/assessments',
    '/student/progress',
    '/chat'
  ],
  // When on lectures page, preload assessment page
  '/student/lectures': ['/student/assessments'],
  // When on assessments page, preload lectures and progress pages
  '/student/assessments': ['/student/lectures', '/student/progress']
};

/**
 * Preload anticipated routes based on current location
 * @param currentPath Current route path
 */
export function preloadAnticipatedRoutes(currentPath: string): void {
  // Only preload in production or when explicitly enabled
  if (process.env.NODE_ENV === 'development' && !window.localStorage.getItem('enablePreload')) {
    return;
  }
  
  const routesToPreload = PRELOAD_ROUTES[currentPath];
  if (!routesToPreload) return;
  
  // Delay preloading slightly to not compete with current page resources
  setTimeout(() => {
    routesToPreload.forEach(route => {
      preloadRoute(route);
      console.log(`[Preloader] Prefetching route: ${route}`);
    });
  }, 1000);
}

/**
 * Initialize the route preloader
 */
export function initRoutePreloader(): () => void {
  let lastPath = window.location.pathname;
  
  // Set up a MutationObserver to detect route changes via DOM
  const observer = new MutationObserver(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      preloadAnticipatedRoutes(currentPath);
    }
  });
  
  observer.observe(document, { subtree: true, childList: true });
  
  // Initial preload based on current route
  preloadAnticipatedRoutes(window.location.pathname);
  
  return () => observer.disconnect();
}
