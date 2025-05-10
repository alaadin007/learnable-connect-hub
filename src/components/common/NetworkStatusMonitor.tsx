
import { useEffect, useState } from 'react';
import { toast } from "@/components/ui/use-toast";

type NetworkStatusProps = {
  onStatusChange?: (isOnline: boolean) => void;
  quietMode?: boolean;
};

export const NetworkStatusMonitor = ({ 
  onStatusChange, 
  quietMode = false 
}: NetworkStatusProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!quietMode) {
        toast.success("You're back online");
      }
      onStatusChange?.(true);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      if (!quietMode) {
        toast.error("You're offline", {
          description: "Please check your internet connection"
        });
      }
      onStatusChange?.(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange, quietMode]);

  return null; // This component doesn't render anything
};

export default NetworkStatusMonitor;
