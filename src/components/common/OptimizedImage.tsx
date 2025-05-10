
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { optimizeImageUrl, generateSrcSet, getOptimalFormat } from '@/utils/imageOptimizer';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
  className?: string;
  containerClassName?: string;
  loadingStrategy?: 'lazy' | 'eager';
  placeholderSrc?: string;
  onLoad?: () => void;
  fallbackSrc?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 85,
  className,
  containerClassName,
  loadingStrategy = 'lazy',
  placeholderSrc = '/placeholder.svg',
  onLoad,
  fallbackSrc,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string>(priority ? src : placeholderSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Setup srcset for responsive images
  const srcSet = src && !src.startsWith('data:')
    ? generateSrcSet(src, [320, 640, 768, 1024, 1280], getOptimalFormat())
    : undefined;

  useEffect(() => {
    // If image should be loaded immediately or visible
    if (priority) {
      setImgSrc(src);
      return;
    }

    // For non-priority images, set up intersection observer
    const imgElement = document.createElement('img');
    
    const handleLoad = () => {
      setImgSrc(src);
      imgElement.removeEventListener('load', handleLoad);
      imgElement.removeEventListener('error', handleError);
    };
    
    const handleError = () => {
      setHasError(true);
      setImgSrc(fallbackSrc || placeholderSrc);
      imgElement.removeEventListener('load', handleLoad);
      imgElement.removeEventListener('error', handleError);
    };
    
    imgElement.addEventListener('load', handleLoad);
    imgElement.addEventListener('error', handleError);
    
    // Start loading the real image
    imgElement.src = optimizeImageUrl(src, { width, height, quality });
    
    return () => {
      imgElement.removeEventListener('load', handleLoad);
      imgElement.removeEventListener('error', handleError);
    };
  }, [src, priority, placeholderSrc, fallbackSrc, width, height, quality]);

  const handleImageLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleImageError = () => {
    setHasError(true);
    setImgSrc(fallbackSrc || placeholderSrc);
  };

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      <img
        src={hasError ? (fallbackSrc || placeholderSrc) : imgSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : loadingStrategy}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        srcSet={!hasError ? srcSet : undefined}
        {...props}
      />
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ height: height ? `${height}px` : '100%' }}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
