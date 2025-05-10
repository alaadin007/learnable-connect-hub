
import { useEffect, useState } from 'react';
import { toast } from "@/components/ui/use-toast";
import { checkSupabaseConnection } from "@/integrations/supabase/client";

type NetworkStatusProps = {
  onStatusChange?: (isOnline: boolean) => void;
  quietMode?: boolean;
  checkDatabase?: boolean;
};

export const NetworkStatusMonitor = ({ 
  onStatusChange, 
  quietMode = false,
  checkDatabase = true,
}: NetworkStatusProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineState, setLastOnlineState] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      // Only show a notification if the state has changed
      if (!lastOnlineState) {
        // When coming back online, check database connection if needed
        if (checkDatabase) {
          try {
            const isConnected = await checkSupabaseConnection();
            
            if (!quietMode) {
              if (isConnected) {
                toast({
                  title: "Connected",
                  description: "You're back online and database connection restored",
                  variant: "default"
                });
              } else {
                toast({
                  title: "Partially Connected",
                  description: "You're online but database connection is unavailable",
                  variant: "warning"
                });
              }
            }
          } catch (err) {
            console.error("Error checking database connection:", err);
            // Still show the online toast even if db check fails
            if (!quietMode) {
              toast({
                title: "Connected",
                description: "You're back online",
                variant: "default"
              });
            }
          }
        } else {
          // Just show online notification without database check
          if (!quietMode) {
            toast({
              title: "Connected",
              description: "You're back online",
              variant: "default"
            });
          }
        }
      }
      
      setLastOnlineState(true);
      onStatusChange?.(true);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      
      // Only show a notification if the state has changed
      if (lastOnlineState && !quietMode) {
        toast({
          title: "You're offline",
          description: "Please check your internet connection",
          variant: "destructive"
        });
      }
      
      setLastOnlineState(false);
      onStatusChange?.(false);
    };
    
    // Add network status event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial database connection check
    if (checkDatabase && navigator.onLine) {
      checkSupabaseConnection().then(isConnected => {
        if (!isConnected && !quietMode) {
          toast({
            title: "Database Connection Issue",
            description: "Some features may not work correctly. Please try again later.",
            variant: "warning"
          });
        }
      }).catch(err => {
        console.error("Initial database connection check failed:", err);
      });
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onStatusChange, quietMode, lastOnlineState, checkDatabase]);

  return null; // This component doesn't render anything visible
};

export default NetworkStatusMonitor;
