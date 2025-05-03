
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, setTestUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Check for registration success message
  useEffect(() => {
    const registered = searchParams.get('registered');
    const emailConfirmed = searchParams.get('email_confirmed');
    
    if (registered === 'true') {
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account before logging in."
      });
    }
    
    if (emailConfirmed === 'true') {
      toast.success("Email verified!", {
        description: "Your email has been verified. You can now log in."
      });
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (userRole) {
      const redirectPath = userRole === 'school' ? '/admin' : 
                          userRole === 'teacher' ? '/teacher/analytics' : 
                          '/dashboard';
      navigate(redirectPath);
    }
  }, [userRole, navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    
    try {
      // Handle test accounts first to ensure they are routed correctly
      if (email.includes('.test@learnable.edu')) {
        // Extract user type from email
        let type: 'school' | 'teacher' | 'student' = 'student';
        
        if (email.startsWith('school')) {
          type = 'school';
        } else if (email.startsWith('teacher')) {
          type = 'teacher';
        }
        
        // Use the setTestUser function which handles all the test account setup
        await setTestUser(type);
        
        // Toast notification
        toast.success("Login successful", {
          description: `Welcome back, ${type === 'school' ? 'School Admin' : type === 'teacher' ? 'Teacher' : 'Student'}!`
        });
        
        setIsLoading(false);
        return;
      }
      
      // For regular users, proceed with normal sign-in flow
      await signIn(email, password);
      
      // Get the user's role
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          // Redirect based on user role
          switch (profile.user_type) {
            case 'school':
              navigate('/admin');
              toast.success("Login successful", {
                description: `Welcome back, ${user.user_metadata.full_name || email}!`
              });
              break;
            case 'teacher':
              navigate('/teacher/analytics');
              toast.success("Login successful", {
                description: `Welcome back, ${user.user_metadata.full_name || email}!`
              });
              break;
            case 'student':
              navigate('/dashboard');
              toast.success("Login successful", {
                description: `Welcome back, ${user.user_metadata.full_name || email}!`
              });
              break;
            default:
              navigate('/dashboard');
              toast.success("Login successful", {
                description: `Welcome back, ${user.user_metadata.full_name || email}!`
              });
          }
        } else {
          // If no profile found, redirect to dashboard as fallback
          navigate('/dashboard');
          toast.success("Login successful");
        }
      } else {
        // Default fallback if no user data
        navigate('/dashboard');
        toast.success("Login successful");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message);
      
      if (error.message.includes("Email not confirmed")) {
        toast.error("Email not verified", {
          description: "Please check your inbox and spam folder for the verification email."
        });
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Login failed", {
          description: "Invalid email or password. Please try again."
        });
      } else {
        toast.error(`Login failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (type: 'school' | 'teacher' | 'student', schoolIndex: number = 0) => {
    try {
      setIsLoading(true);
      setLoginError(null);
      
      // First, ensure test accounts exist
      const { data: exists, error: checkError } = await supabase.rpc('verify_school_code', { 
        code: "TESTCODE"
      });
      
      if (checkError || !exists) {
        toast.loading("Setting up test accounts...", {
          id: "create-test-accounts"
        });
        
        const response = await supabase.functions.invoke("create-test-accounts", {
          body: { createAccounts: true }
        });
        
        if (response.error) {
          toast.error("Failed to create test accounts", {
            id: "create-test-accounts"
          });
          setLoginError("Failed to create test accounts");
          return;
        }
        
        toast.success("Test accounts created", {
          id: "create-test-accounts"
        });
      }
      
      // Now login with the test user
      await setTestUser(type, schoolIndex);
      
      // Navigate based on user type for test accounts
      if (type === 'school') {
        navigate('/admin');
      } else if (type === 'teacher') {
        navigate('/teacher/analytics');
      } else {
        navigate('/dashboard');
      }
      
      toast.success(`Logged in as ${type === 'school' ? 'School Admin' : type === 'teacher' ? 'Teacher' : 'Student'}`);
    } catch (error: any) {
      console.error("Quick login error:", error);
      setLoginError(`Failed to log in with test account: ${error.message}`);
      toast.error("Failed to log in with test account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login?email_confirmed=true",
      });
      
      if (error) {
        toast.error("Failed to send password reset email: " + error.message);
      } else {
        toast.success("Password reset email sent", {
          description: "Please check your inbox and spam folder for the reset link."
        });
      }
    } catch (error: any) {
      toast.error("An error occurred: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your email and password to log in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loginError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Error</AlertTitle>
              <AlertDescription>
                {loginError.includes("Email not confirmed") 
                  ? "Your email address has not been verified. Please check your inbox for the verification email."
                  : loginError}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex">
              <Clock className="h-5 w-5 text-amber-700 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">
                  Need quick access?
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Use our pre-configured test accounts for instant login without email verification.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleQuickLogin('school')}
                    className="text-sm text-blue-800 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Admin Login
                  </button>
                  <button 
                    onClick={() => handleQuickLogin('teacher')}
                    className="text-sm text-green-800 font-semibold hover:text-green-900 bg-green-100 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Teacher Login
                  </button>
                  <button 
                    onClick={() => handleQuickLogin('student')}
                    className="text-sm text-purple-800 font-semibold hover:text-purple-900 bg-purple-100 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Student Login
                  </button>
                  <Link 
                    to="/test-accounts" 
                    className="text-sm text-amber-800 font-semibold hover:text-amber-900 bg-amber-200 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    View All →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@school.edu" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-sm text-learnable-blue hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gradient-bg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : "Log in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-600 text-center w-full">
            Don't have an account?{" "}
            <Link to="/register" className="text-learnable-blue hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginForm;
