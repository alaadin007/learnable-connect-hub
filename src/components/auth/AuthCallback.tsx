
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Button } from '@/components/ui/button';

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the URL hash and pass it to the Supabase client
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const queryParams = new URLSearchParams(location.search);
        
        // Check for auth code in query params (PKCE flow)
        const code = queryParams.get('code');
        const provider = queryParams.get('provider');
        
        if (code) {
          // We have an auth code, let's process it
          console.log('Processing authentication with code');
          setLoading(true);
          
          if (provider) {
            setAuthProvider(provider);
          }
          
          // The session will be automatically set by the Supabase client
          // because we have detectSessionInUrl set to true
          
          // Let's get the session to confirm
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            throw sessionError;
          }
          
          if (data.session) {
            setSuccess(true);
            toast.success('Authentication successful!');
            
            // Redirect to dashboard after a brief delay
            setTimeout(() => {
              // Determine where to redirect based on user type
              if (data.session?.user?.user_metadata?.user_type === 'school') {
                navigate('/admin');
              } else if (data.session?.user?.user_metadata?.user_type === 'teacher') {
                navigate('/teacher/analytics');
              } else {
                navigate('/dashboard');
              }
            }, 1000);
          } else {
            setError('No session found after authentication. Please try logging in again.');
          }
        } else {
          // No auth parameters found
          setError('No authentication parameters found in the URL.');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'An error occurred during authentication.');
        toast.error('Authentication error', { 
          description: err.message || 'Please try again' 
        });
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [location, navigate]);

  const getProviderTitle = () => {
    if (!authProvider) return 'your account';
    
    switch(authProvider.toLowerCase()) {
      case 'google':
        return 'Google';
      case 'microsoft':
        return 'Microsoft';
      case 'github':
        return 'GitHub';
      default:
        return 'your account';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="mt-4 text-lg font-semibold">Verifying your account...</h2>
          <p className="text-gray-500 mt-2">Please wait while we complete the authentication process.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={() => navigate('/login')} variant="default">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {authProvider ? `${getProviderTitle()} Login Successful!` : 'Authentication Successful!'}
          </h1>
          <p className="text-gray-600 mb-6">
            You have been successfully authenticated. You will be redirected to your dashboard shortly.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="gradient-bg">
            Continue to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
