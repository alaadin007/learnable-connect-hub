
/**
 * Utility for optimizing image loading
 */

// Check if the browser supports modern image formats
const supportsWebp = () => {
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
};

// Detect browser support for various image formats
export const supportedFormats = {
  webp: typeof document !== 'undefined' ? supportsWebp() : false,
  avif: false, // Could implement detection if needed
};

// Get optimal image format based on browser support
export const getOptimalFormat = () => {
  if (supportedFormats.webp) return 'webp';
  return 'jpg'; // Fallback format
};

// Calculate responsive image size
export function getResponsiveImageSize(
  actualWidth: number,
  containerWidth: number = window.innerWidth
): number {
  // Calculate appropriate size based on container and device pixel ratio
  const pixelRatio = window.devicePixelRatio || 1;
  const targetWidth = Math.min(containerWidth * pixelRatio, actualWidth);
  
  // Round to nearest standard breakpoint for better caching
  const breakpoints = [320, 480, 640, 768, 1024, 1280, 1536, 1920];
  return breakpoints.find(bp => bp >= targetWidth) || actualWidth;
}

// Generate srcset for responsive images
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 480, 640, 768, 1024, 1280],
  format: string = getOptimalFormat()
): string {
  return widths
    .map(width => `${baseUrl}?w=${width}&fmt=${format} ${width}w`)
    .join(', ');
}

// Create optimized image URL with parameters
export function optimizeImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  } = {}
): string {
  if (!url) return '';
  
  const {
    width,
    height,
    quality = 80,
    format = getOptimalFormat()
  } = options;
  
  // Skip for data URLs or external URLs we can't optimize
  if (url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('/')) {
    return url;
  }
  
  // Build query parameters
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  params.append('fmt', format);
  
  // Return optimized URL
  return `${url}?${params.toString()}`;
}

// Preload critical images
export function preloadCriticalImages(urls: string[]): void {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}
