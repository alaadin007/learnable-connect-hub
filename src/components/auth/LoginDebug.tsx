
import { useState, useEffect } from 'react';
import { supabase, SUPABASE_PUBLIC_URL } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

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
    const { data, error } = await supabase.auth.getSession();
    console.log('Current session:', data.session);
    console.log('Session error:', error);
    alert(data.session ? 'Active session found' : 'No active session');
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

          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={testSession} className="text-xs">
              Test Session
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="text-xs"
            >
              Clear Storage & Reload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginDebug;
