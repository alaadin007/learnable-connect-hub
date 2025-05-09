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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginAttemptInProgress, setLoginAttemptInProgress] = useState(false);
  
  const { signIn, setTestUser, userRole, refreshProfile, session, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
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

  // Check if user is already authenticated and redirect immediately
  useEffect(() => {
    console.log("LoginForm: Checking if user is already authenticated");
    
    if (user && session && userRole) {
      console.log("LoginForm: User is authenticated, redirecting based on role:", userRole);
      
      let redirectPath = "/dashboard";
      if (userRole === "school" || userRole === "school_admin") {
        redirectPath = "/admin";
      } else if (userRole === "teacher") {
        redirectPath = "/teacher/analytics";
      }
      
      navigate(redirectPath, { 
        replace: true, 
        state: { 
          preserveContext: true,
          timestamp: Date.now()
        } 
      });
    }
  }, [user, session, userRole, navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    console.log("LoginForm: Login attempt started");

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    // Prevent double submission
    if (loginAttemptInProgress) {
      console.log("Login attempt already in progress, ignoring duplicate request");
      return;
    }
    
    setIsLoading(true);
    setLoginAttemptInProgress(true);

    try {
      // Handle test accounts - direct login without authentication
      if (email.includes(".test@learnable.edu")) {
        console.log(`Using test account login flow for ${email}`);
        let type: "school" | "teacher" | "student" = "student";
        if (email.startsWith("school")) type = "school";
        else if (email.startsWith("teacher")) type = "teacher";

        await setTestUser(type);
        console.log(`Test user set: ${type}`);

        const redirectPath = type === "school"
          ? "/admin"
          : type === "teacher"
          ? "/teacher/analytics"
          : "/dashboard";

        toast.success("Login successful", {
          description: `Welcome, ${
            type === "school"
              ? "School Admin"
              : type === "teacher"
              ? "Teacher"
              : "Student"
          }!`,
        });

        navigate(redirectPath, { 
          replace: true, 
          state: { 
            fromTestAccounts: true, 
            accountType: type,
            preserveContext: true,
            timestamp: Date.now()
          } 
        });
        return;
      }

      console.log(`Attempting to login with email: ${email}`);
      
      // Regular user login flow - using direct Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Supabase authentication error:", error);
        throw error;
      }

      if (!data?.user) {
        console.error("Login successful but no user data returned");
        throw new Error("User data not found after authentication");
      }

      console.log("Login successful, user data:", data.user);
      
      // Immediately refresh profile data
      await refreshProfile();
      console.log("Profile refreshed after login");
      
      toast.success("Login successful", {
        description: `Welcome back, ${data.user.user_metadata?.full_name || email}!`,
      });

      // Extract role information
      const userType = data.user.user_metadata?.user_type;
      let isSchoolAdmin = userType === "school" || userType === "school_admin";
      
      // If not in metadata, try to identify from email patterns
      if (!isSchoolAdmin && data.user.email) {
        if (data.user.email.startsWith('school') || data.user.email.startsWith('admin')) {
          isSchoolAdmin = true;
        }
      }

      // Immediate redirect based on user type
      if (isSchoolAdmin) {
        navigate("/admin", { 
          state: { preserveContext: true, timestamp: Date.now() }, 
          replace: true 
        });
      } else if (userType === "teacher") {
        navigate("/teacher/analytics", { 
          state: { preserveContext: true, timestamp: Date.now() }, 
          replace: true 
        });
      } else {
        navigate("/dashboard", { 
          state: { preserveContext: true, timestamp: Date.now() }, 
          replace: true 
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message);

      if (error.message) {
        if (error.message.includes("Email not confirmed")) {
          toast.error("Email not verified", {
            description:
              "Please check your inbox and spam folder for the verification email.",
          });
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error("Login failed", {
            description: "Invalid email or password. Please try again.",
          });
        } else {
          toast.error(`Login failed: ${error.message}`);
        }
      } else {
        toast.error("Login failed due to network issue", {
          description: "Please check your connection and try again."
        });
      }
    } finally {
      setIsLoading(false);
      setLoginAttemptInProgress(false);
    }
  };

  const handleQuickLogin = async (
    type: "school" | "teacher" | "student",
    schoolIndex = 0
  ) => {
    console.log(`Quick login attempt for ${type}`);
    // Prevent double submission
    if (loginAttemptInProgress) {
      return;
    }
    
    setIsLoading(true);
    setLoginAttemptInProgress(true);
    setLoginError(null);

    try {
      // Direct login for test accounts
      await setTestUser(type, schoolIndex);
      console.log(`Test user set for quick login: ${type}`);

      // Define redirect paths
      let redirectPath = "/dashboard";
      if (type === "school") {
        redirectPath = "/admin";
      } else if (type === "teacher") {
        redirectPath = "/teacher/analytics";
      }

      toast.success(
        `Logged in as ${
          type === "school"
            ? "School Admin"
            : type === "teacher"
            ? "Teacher"
            : "Student"
        }`
      );

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
    } finally {
      setIsLoading(false);
      setLoginAttemptInProgress(false);
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
        redirectTo: `${window.location.origin}/login?email_confirmed=true`,
      });

      if (error) {
        toast.error("Failed to send password reset email: " + error.message);
      } else {
        toast.success("Password reset email sent", {
          description:
            "Please check your inbox and spam folder for the reset link.",
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

          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex">
              <Clock className="h-5 w-5 text-amber-700 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Need quick access?</p>
                <p className="mt-1 text-sm text-amber-700">
                  Use our pre-configured test accounts for instant login without email verification.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("school")}
                    className="text-sm text-blue-800 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full transition-colors duration-200"
                    disabled={isLoading}
                  >
                    Admin Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("teacher")}
                    className="text-sm text-green-800 font-semibold hover:text-green-900 bg-green-100 px-3 py-1 rounded-full transition-colors duration-200"
                    disabled={isLoading}
                  >
                    Teacher Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("student")}
                    className="text-sm text-purple-800 font-semibold hover:text-purple-900 bg-purple-100 px-3 py-1 rounded-full transition-colors duration-200"
                    disabled={isLoading}
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
                  className="text-sm text-learnable-blue hover:underline"
                  disabled={isLoading}
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
              className="w-full gradient-bg"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
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
