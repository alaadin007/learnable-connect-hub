
import { useState, useEffect } from 'react';
import { supabase, SUPABASE_PUBLIC_URL } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const LoginDebug: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if we can reach Supabase - a simple health check
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        
        if (error) {
          console.error('Supabase connection error:', error);
          setConnectionStatus('error');
          setErrorMessage(error.message);
        } else {
          setConnectionStatus('success');
          setErrorMessage(null);
        }
      } catch (err: any) {
        console.error('Unexpected error checking Supabase connection:', err);
        setConnectionStatus('error');
        setErrorMessage(err.message || 'Unknown error connecting to Supabase');
      }
    };

    checkConnection();
  }, []);

  const testSession = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Current session:', data.session);
      
      if (error) {
        console.error('Session error:', error);
        toast.error(`Session error: ${error.message}`);
      } else {
        toast.info(data.session ? 'Active session found' : 'No active session');
      }
    } catch (err: any) {
      console.error('Error checking session:', err);
      toast.error(`Error checking session: ${err.message}`);
    }
  };

  const clearAndReload = () => {
    localStorage.clear();
    toast.info('Local storage cleared, reloading page...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const testDirectAuth = async () => {
    try {
      const testEmail = 'test@example.com';
      const testPassword = 'password123';
      
      toast.info(`Testing auth with ${testEmail}...`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (error) {
        // This is expected as the credentials are fake
        toast.success('Auth API is working (expected error with test credentials)');
      } else {
        toast.warning('Unexpected success with test credentials');
      }
    } catch (err: any) {
      console.error('Direct auth test error:', err);
      toast.error(`Auth API error: ${err.message}`);
    }
  };

  return (
    <div className="mt-6 text-sm">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm" 
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs"
        >
          {showDetails ? 'Hide Debug Info' : 'Show Debug Info'}
        </Button>
      </div>

      {showDetails && (
        <div className="mt-2 p-4 bg-gray-50 rounded-md text-left">
          <h3 className="font-medium">Connection Status:</h3>
          <div className="flex items-center gap-2 mt-1">
            {connectionStatus === 'checking' && <span className="text-yellow-500">●</span>}
            {connectionStatus === 'success' && <span className="text-green-500">●</span>}
            {connectionStatus === 'error' && <span className="text-red-500">●</span>}
            <span>{connectionStatus === 'checking' ? 'Checking...' : connectionStatus === 'success' ? 'Connected' : 'Connection Error'}</span>
          </div>
          
          {errorMessage && (
            <div className="mt-2 text-red-600">
              <p className="font-medium">Error:</p>
              <p className="text-xs break-all">{errorMessage}</p>
            </div>
          )}

          <div className="mt-3">
            <p><strong>Supabase URL:</strong> <span className="text-xs break-all">{SUPABASE_PUBLIC_URL}</span></p>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={testSession} className="text-xs">
              Test Session
            </Button>
            <Button size="sm" variant="outline" onClick={testDirectAuth} className="text-xs">
              Test Auth API
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={clearAndReload}
              className="text-xs"
            >
              Clear Storage & Reload
            </Button>
          </div>
          
          <div className="mt-3 text-xs text-gray-600">
            <p><strong>Note:</strong> If you're having login issues, try using the test accounts:</p>
            <ul className="list-disc pl-4 mt-1">
              <li>student@testschool.edu</li>
              <li>teacher@testschool.edu</li>
              <li>school@testschool.edu</li>
            </ul>
            <p className="mt-1">(Any password will work with test accounts)</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginDebug;
