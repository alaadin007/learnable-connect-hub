import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
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
    if (user && session && userRole) {
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
    setIsLoggingIn(true);

    if (!email || !password) {
      toast.error("Please enter both email and password");
      setIsLoggingIn(false);
      return;
    }

    try {
      // Handle test accounts - direct login without authentication
      if (email.includes(".test@learnable.edu")) {
        let type: "school" | "teacher" | "student" = "student";
        if (email.startsWith("school")) type = "school";
        else if (email.startsWith("teacher")) type = "teacher";

        await setTestUser(type);

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
        setIsLoggingIn(false);
        return;
      }
      
      // Regular user login flow - using direct Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error("User data not found after authentication");
      }
      
      // Store session in localStorage (this is crucial for API headers)
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      }));

      // Set auth state - Pass the entire session object
      await signIn(data.session);
      
      // Immediately refresh profile data
      await refreshProfile();
      
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
        } else if (error.message.includes("No API key found")) {
          toast.error("API Configuration Error", {
            description: "There's an issue with the API configuration. Please contact support.",
          });
          console.error("API Key Error:", error);
        } else {
          toast.error(`Login failed: ${error.message}`);
        }
      } else {
        toast.error("Login failed due to network issue", {
          description: "Please check your connection and try again."
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = async (
    type: "school" | "teacher" | "student",
    schoolIndex = 0
  ) => {
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      // Direct login for test accounts
      await setTestUser(type, schoolIndex);

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
      setLoginError(`Failed to log in with test account: ${error.message}`);
      toast.error("Failed to log in with test account");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

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
                    disabled={isLoggingIn}
                    className="text-sm text-blue-800 font-semibold hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full transition-colors duration-200 disabled:opacity-50"
                  >
                    Admin Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("teacher")}
                    disabled={isLoggingIn}
                    className="text-sm text-green-800 font-semibold hover:text-green-900 bg-green-100 px-3 py-1 rounded-full transition-colors duration-200 disabled:opacity-50"
                  >
                    Teacher Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("student")}
                    disabled={isLoggingIn}
                    className="text-sm text-purple-800 font-semibold hover:text-purple-900 bg-purple-100 px-3 py-1 rounded-full transition-colors duration-200 disabled:opacity-50"
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
                disabled={isLoggingIn}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-sm text-learnable-blue hover:underline"
                  disabled={isLoggingIn}
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
                disabled={isLoggingIn}
              />
            </div>
            <Button
              type="submit"
              className="w-full gradient-bg"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <span className="flex items-center">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></span>
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
