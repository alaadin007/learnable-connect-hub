import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTestAccount, setActiveTestAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { signIn, setTestUser, userRole, session, signOut, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Show success toast for registration and email verification
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account before logging in."
      });
    }
    if (searchParams.get('email_confirmed') === 'true') {
      toast.success("Email verified!", {
        description: "Your email has been verified. You can now log in."
      });
    }
  }, [searchParams]);

  // Check if a test account is already active
  useEffect(() => {
    const checkActiveTestAccount = () => {
      const usingTestAccount = localStorage.getItem('usingTestAccount') === 'true';
      const testAccountType = localStorage.getItem('testAccountType');
      
      if (usingTestAccount && testAccountType) {
        setActiveTestAccount(testAccountType);
      } else {
        setActiveTestAccount(null);
      }
    };
    
    checkActiveTestAccount();
    
    // Add event listener to detect changes to localStorage
    window.addEventListener('storage', checkActiveTestAccount);
    
    return () => {
      window.removeEventListener('storage', checkActiveTestAccount);
    };
  }, []);

  // Redirect if user role already set - with debounce to prevent redirect loops
  useEffect(() => {
    if (userRole && session && !isRedirecting) {
      console.log("LoginForm: User role already set, redirecting to appropriate dashboard:", userRole);
      setIsRedirecting(true);
      
      // Get intended destination from location state or use default
      const from = location.state?.from?.pathname || getUserRedirectPath(userRole);
      
      // Small timeout to prevent potential redirect loops
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
    }
  }, [userRole, session, navigate, location.state]);

  // Helper function to determine redirect path based on user role
  const getUserRedirectPath = (role: string): string => {
    switch (role) {
      case "school":
      case "school_admin": // Handle legacy role name
        return "/admin";
      case "teacher":
      case "teacher_supervisor": // Handle legacy role name
        return "/teacher/analytics";
      case "student":
        return "/dashboard";
      default:
        return "/dashboard";
    }
  };

  // Fast test account login - no delays or spinners
  const handleQuickLogin = async (type: "school" | "teacher" | "student") => {
    try {
      setIsLoading(true);
      setLoginError(null);
      console.log(`LoginForm: Fast login as ${type}`);
      
      // Clean up any existing session
      await signOut();
      
      // Reset state flags
      localStorage.removeItem('usingTestAccount');
      localStorage.removeItem('testAccountType');
      
      // Set new test account flags
      localStorage.setItem('usingTestAccount', 'true');
      localStorage.setItem('testAccountType', type);
      
      // Direct instant login for test accounts
      const success = await setTestUser(type);
      if (!success) {
        throw new Error(`Failed to set up ${type} test account`);
      }
      
      // Define redirect paths
      const redirectPath = getUserRedirectPath(type);

      console.log(`LoginForm: Redirecting quick login user to ${redirectPath}`);
      toast.success(
        `Logged in as ${
          type === "school"
            ? "School Admin"
            : type === "teacher"
            ? "Teacher"
            : "Student"
        }`
      );

      // Immediate navigation without delays
      navigate(redirectPath, { 
        replace: true,
        state: { 
          fromTestAccounts: true,
          accountType: type,
          preserveContext: true,
          timestamp: Date.now()
        }
      });
    } catch (error: any) {
      console.error("Quick login error:", error);
      setLoginError(`Failed to log in with test account: ${error.message}`);
      toast.error("Failed to log in with test account");
      
      // Clean any partial test account state on error
      localStorage.removeItem('usingTestAccount');
      localStorage.removeItem('testAccountType');
      setActiveTestAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    if (!email || !password) {
      toast.error("Please enter both email and password");
      setIsLoading(false);
      return;
    }
    
    console.log(`LoginForm: Attempting login for ${email}`);

    try {
      // If there's already a test account active, sign out first
      if (activeTestAccount) {
        await signOut();
        localStorage.removeItem('usingTestAccount');
        localStorage.removeItem('testAccountType');
        setActiveTestAccount(null);
      }
      
      // Special handling for test accounts - instant login
      if (email.includes(".test@learnable.edu")) {
        let type: "school" | "teacher" | "student" = "student";
        if (email.startsWith("school")) type = "school";
        else if (email.startsWith("teacher")) type = "teacher";
        
        await handleQuickLogin(type);
        return;
      }
      
      // Handle normal login with credentials
      const { data, error } = await signIn(email, password);
      
      if (error) {
        throw error;
      }

      if (data?.user) {
        console.log("Login successful:", data.user.id);
        
        // Force a session refresh to ensure we have the latest user data
        await refreshSession();
        
        toast.success("Login successful", {
          description: "Welcome back!",
        });
        
        // Let the useEffect handle the redirection based on userRole
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message);

      // Improved error messages
      if (error.message?.includes("Email not confirmed")) {
        toast.error("Email not verified", {
          description: "Please check your inbox and spam folder for the verification email.",
          action: {
            label: "Resend",
            onClick: () => handleResendVerification(),
          },
        });
      } else if (error.message?.includes("Invalid login credentials")) {
        toast.error("Login failed", {
          description: "Invalid email or password. Please try again.",
        });
      } else {
        toast.error(`Login failed: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    try {
      setIsLoading(true);
      // Direct call to Supabase to resend verification email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        toast.error("Failed to resend verification email: " + error.message);
      } else {
        toast.success("Verification email sent", {
          description: "Please check your inbox and spam folder for the verification link.",
        });
      }
    } catch (error: any) {
      toast.error("An error occurred: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setIsLoading(true);
      // Direct call to Supabase to reset password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?email_confirmed=true`,
      });

      if (error) {
        toast.error("Failed to send password reset email: " + error.message);
      } else {
        toast.success("Password reset email sent", {
          description: "Please check your inbox and spam folder for the reset link.",
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
          <CardDescription>Enter your email and password to log in</CardDescription>
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

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-700 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 font-medium">Need quick access?</p>
                <p className="mt-1 text-sm text-blue-700">
                  Use our pre-configured test accounts for instant login without email verification.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("school")}
                    disabled={isLoading}
                    className={`text-sm text-blue-800 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full transition-colors duration-200 ${
                      activeTestAccount === "school" ? "ring-2 ring-blue-500" : ""
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {activeTestAccount === "school" ? "Active Admin" : "Admin Login"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("teacher")}
                    disabled={isLoading}
                    className={`text-sm text-green-800 font-semibold hover:text-green-900 bg-green-100 px-3 py-1 rounded-full transition-colors duration-200 ${
                      activeTestAccount === "teacher" ? "ring-2 ring-green-500" : ""
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {activeTestAccount === "teacher" ? "Active Teacher" : "Teacher Login"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("student")}
                    disabled={isLoading}
                    className={`text-sm text-purple-800 font-semibold hover:text-purple-900 bg-purple-100 px-3 py-1 rounded-full transition-colors duration-200 ${
                      activeTestAccount === "student" ? "ring-2 ring-purple-500" : ""
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {activeTestAccount === "student" ? "Active Student" : "Student Login"}
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
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isLoading}
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
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full gradient-bg transition-all duration-300 relative overflow-hidden"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Log in"
              )}
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
