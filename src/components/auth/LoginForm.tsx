
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const { signIn, setTestUser, sendEmailVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const invitationToken = queryParams.get('invitation');
  const emailConfirmed = queryParams.get('email_confirmed') === 'true';
  const registered = queryParams.get('registered') === 'true';
  const returnUrl = location.state?.returnUrl || '/dashboard';
  
  useEffect(() => {
    if (emailConfirmed) {
      toast.success('Email confirmed! You can now log in.');
    }
    
    if (registered) {
      toast.info('Registration successful! Please verify your email before logging in.');
    }
  }, [emailConfirmed, registered]);

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setLoginError(null);
    setVerificationSent(false);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setLoginError(null);
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await sendEmailVerification(email);
      setVerificationSent(true);
    } catch (error: any) {
      toast.error('Failed to send verification email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);
    
    try {
      // Check if email is a test account pattern
      const testAccountPattern = /^(school|teacher|student)\.test@learnable\.edu$/;
      if (testAccountPattern.test(email)) {
        const detectedRole = email.split('.')[0] as "school" | "teacher" | "student";
        console.log(`LoginForm: Detected test account for role: ${detectedRole}`);
        
        // For test accounts, we don't actually authenticate, just set up the test user
        const success = await setTestUser(detectedRole);
        if (success) {
          localStorage.setItem('usingTestAccount', 'true');
          localStorage.setItem('testAccountType', detectedRole);
          
          if (detectedRole === 'school') {
            navigate('/admin');
          } else if (detectedRole === 'teacher') {
            navigate('/teacher/analytics');
          } else {
            navigate(returnUrl);
          }
          return;
        }
      }
      
      // Handle normal login with credentials
      const result = await signIn(email, password);
      if (!result) {
        setLoginError('An error occurred during login.');
        return;
      }
      
      const { data, error } = result;
      
      if (error) {
        console.error("Login error:", error);
        
        if (error.message.includes('Email not confirmed')) {
          setLoginError('Please verify your email before logging in.');
          toast.error('Email not verified', {
            description: 'Please check your inbox for the verification link or request a new one.'
          });
          return;
        } else if (error.message.includes('Invalid login credentials')) {
          setLoginError('Invalid email or password. Please try again.');
        } else {
          setLoginError(error.message || 'An error occurred during login.');
        }
        return;
      }
      
      if (invitationToken) {
        // If user was invited, accept the invitation
        navigate(`/invitation/${invitationToken}`);
      } else {
        // Determine where to redirect based on user type
        if (data?.user?.user_metadata?.user_type === 'school') {
          navigate('/admin');
        } else if (data?.user?.user_metadata?.user_type === 'teacher') {
          navigate('/teacher/analytics');
        } else {
          navigate(returnUrl);
        }
      }
    } catch (error: any) {
      console.error("Login catch block error:", error);
      setLoginError(error.message || 'An unexpected error occurred');
      
      // Check if this is a verification issue
      if (error.message && 
          (error.message.includes('Email not confirmed') || 
           error.message.includes('not verified') || 
           error.message.includes('verification'))) {
        toast.error('Email not verified', {
          description: 'Please check your inbox for the verification link or request a new one below.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-learnable-super-light">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Login</CardTitle>
          <CardDescription className="text-center">Enter your email and password to log in</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {loginError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}
          
          {verificationSent && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Verification Email Sent</AlertTitle>
              <AlertDescription className="text-green-700">
                Please check your inbox (including spam folder) and click the verification link.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="grid gap-2 mb-4">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="grid gap-2 mb-6">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                disabled={isSubmitting}
                required
              />
            </div>
            <Button className="w-full gradient-bg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </Button>
            
            {loginError && loginError.includes('verify') && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full mt-4"
                onClick={handleResendVerification}
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending verification...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>
            )}
          </form>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
              Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register here</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
