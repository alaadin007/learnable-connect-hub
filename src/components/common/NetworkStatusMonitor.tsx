
import { useEffect, useState } from 'react';
import { toast } from "sonner";
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
                toast("Connected", {
                  description: "You're back online and database connection restored"
                });
              } else {
                toast.error("Database Connection Error", {
                  description: "You're online but database connection is unavailable"
                });
              }
            }
          } catch (err) {
            console.error("Error checking database connection:", err);
            toast.error("Database Connection Error", {
              description: "Unable to verify database connection"
            });
          }
        } else {
          // Just show online notification without database check
          if (!quietMode) {
            toast("Connected", {
              description: "You're back online"
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
        toast.error("You're offline", {
          description: "Please check your internet connection"
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
          toast.error("Database Connection Error", {
            description: "Unable to connect to database. Please check your network connection."
          });
        }
      }).catch(err => {
        console.error("Initial database connection check failed:", err);
        if (!quietMode) {
          toast.error("Database Connection Error", {
            description: "Unable to verify database connection"
          });
        }
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
