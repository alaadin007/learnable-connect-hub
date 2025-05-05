import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { signIn, setTestUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const invitationToken = queryParams.get('invitation');
  const emailConfirmed = queryParams.get('email_confirmed') === 'true';
  
  useEffect(() => {
    if (emailConfirmed) {
      // Optionally show a toast or alert indicating email is confirmed
      console.log('Email confirmed, you can now log in.');
    }
  }, [emailConfirmed]);

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
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
          navigate('/dashboard');
          return;
        }
      }
      
      // Check if email has a specific pattern that indicates likely role
      const emailPattern = {
        school: /@school\.(edu|org|com)$/i,
        teacher: /@(teacher|faculty|staff|edu)\.(edu|org|com)$/i,
        student: /@(student)\.(edu|org|com)$/i
      };
      
      let detectedRole = null;
      for (const [role, pattern] of Object.entries(emailPattern)) {
        if (pattern.test(email)) {
          detectedRole = role;
          break;
        }
      }
      
      if (detectedRole) {
        console.log(`LoginForm: Detected potential role from email pattern: ${detectedRole}`);
      }
      
      // Handle normal login with credentials - optimized for instant login
      const result = await signIn(email, password);
      const { data, error } = result;
      
      if (error) {
        console.error("Login error:", error);
        
        if (error.message.includes('Email not confirmed')) {
          setLoginError('Please check your email to confirm your account before logging in.');
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
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error("Login catch block error:", error);
      setLoginError(error.message || 'An unexpected error occurred');
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
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="Enter your email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full gradient-bg" onClick={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginForm;
