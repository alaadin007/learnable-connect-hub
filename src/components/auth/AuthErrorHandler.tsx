
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AuthErrorHandlerProps {
  children: React.ReactNode;
}

const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({ children }) => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [hasAuthError, setHasAuthError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  // Check for auth errors - if user exists but profile doesn't, that's an error state
  useEffect(() => {
    if (user && !profile && !isRefreshing) {
      console.log("Auth error detected: User exists but profile is missing");
      setHasAuthError(true);
    } else {
      setHasAuthError(false);
    }
  }, [user, profile, isRefreshing]);

  const handleRetry = async () => {
    setIsRefreshing(true);
    try {
      console.log("Attempting to refresh profile");
      if (refreshProfile) {
        const result = await refreshProfile();
        if (result) {
          console.log("Profile refresh successful", result);
          setHasAuthError(false);
          toast.success("Profile refreshed successfully");
        } else {
          console.error("Profile refresh returned no data");
          toast.error("Couldn't refresh profile. Please try logging in again.");
        }
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
      toast.error("Error refreshing profile. Please try logging in again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.info("Signed out successfully");
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
      // Force a hard reload as a last resort
      window.location.href = '/login';
    }
  };

  if (hasAuthError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-learnable-super-light">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <div className="flex items-center text-red-500 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">User profile not available</h2>
          </div>
          
          <p className="text-gray-700 mb-6">
            We couldn't load your user profile. This might be due to a temporary issue or your session may have expired.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleRetry} 
              className="flex-1"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </>
              )}
            </Button>
            <Button 
              onClick={handleLogout} 
              variant="outline"
              className="flex-1"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthErrorHandler;
