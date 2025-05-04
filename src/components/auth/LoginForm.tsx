import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Loader2, AlertCircle, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { signIn, setTestUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loginError, setLoginError] = useState<string | null>(null);
  
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

  // Redirect if user role already set
  useEffect(() => {
    if (userRole) {
      const redirectPath = userRole === "school"
        ? "/admin"
        : userRole === "teacher"
        ? "/teacher/analytics"
        : "/dashboard";

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
      // Log the login attempt for debugging
      console.log(`Attempting to login with email: ${email}`);
      
      // Handle test accounts - direct login without authentication
      if (email.includes(".test@learnable.edu")) {
        let type: "school" | "teacher" | "student" = "student";
        if (email.startsWith("school")) type = "school";
        else if (email.startsWith("teacher")) type = "teacher";

        console.log(`LoginForm: Setting up test user of type ${type}`);
        await setTestUser(type);
        console.log(`LoginForm: Successfully set up test user of type ${type}`);

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

        console.log(`LoginForm: Redirecting test user to ${redirectPath}`);
        navigate(redirectPath, { 
          replace: true, 
          state: { 
            fromTestAccounts: true, 
            accountType: type,
            preserveContext: true
          } 
        });
        return;
      }

      // First check if the user exists by attempting a password reset
      // This is a workaround to check if an email exists without revealing too much info
      const { data: userExistsCheck, error: userCheckError } = await supabase.auth.resetPasswordForEmail(
        email, 
        { redirectTo: `${window.location.origin}/login` }
      );
      
      // If there's no error with the reset password request, the email exists
      if (!userCheckError) {
        console.log("Email exists in the system, proceeding with login");
        
        // Proceed with regular login flow
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (signInError) {
          console.error("Login error from Supabase:", signInError);
          
          // Handle different types of login errors
          if (signInError.message.includes("Invalid login credentials")) {
            setLoginError("Invalid login credentials. Please check your email and password and try again.");
            toast.error("Login failed", {
              description: "Invalid email or password combination."
            });
          } else if (signInError.message.includes("Email not confirmed")) {
            setLoginError("Your email has not been verified. Please check your inbox for the verification email.");
            toast.error("Email not verified", {
              description: "Please check your inbox for the verification email.",
              action: {
                label: "Resend email",
                onClick: async () => handleResendVerification(email),
              }
            });
          } else {
            setLoginError(signInError.message);
            toast.error("Authentication error", {
              description: signInError.message
            });
          }
          
          throw signInError;
        }

        console.log("Sign in successful:", signInData);

        // Check if we have a user after login
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          console.log("Retrieved user after login:", user);
        
          // Get user profile to determine redirect path
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("user_type")
            .eq("id", user.id)
            .maybeSingle();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
            toast.error("Error fetching profile", {
              description: "Please try logging in again."
            });
          }

          console.log("User profile retrieved:", profile);

          const redirectPath =
            profile?.user_type === "school"
              ? "/admin"
              : profile?.user_type === "teacher"
              ? "/teacher/analytics"
              : "/dashboard";

          toast.success("Login successful", {
            description: `Welcome back, ${
              user.user_metadata?.full_name || email
            }!`,
          });

          navigate(redirectPath);
        } else {
          // fallback
          toast.success("Login successful");
          navigate("/dashboard");
        }
      } else {
        // User doesn't exist, show registration suggestion
        console.log("Email doesn't exist in the system");
        setLoginError(`The email "${email}" is not registered in our system.`);
        toast.error("Account not found", {
          description: "This email is not registered. Would you like to create an account?",
          action: {
            label: "Register",
            onClick: () => navigate("/register")
          }
        });
      }
      
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Error is already handled above, this is just a fallback
      if (!loginError) {
        setLoginError(error.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      
      if (error) throw error;
      
      toast.success("Verification email sent", {
        description: "Please check your inbox and spam folder."
      });
    } catch (err: any) {
      toast.error("Failed to resend verification email", {
        description: err.message
      });
    }
  };

  const handleQuickLogin = async (
    type: "school" | "teacher" | "student",
    schoolIndex = 0
  ) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      console.log(`LoginForm: Quick login as ${type}`);
      
      // Direct login for test accounts
      await setTestUser(type, schoolIndex);
      console.log(`LoginForm: Successfully set up quick login for ${type}`);

      // Define redirect paths
      let redirectPath = "/dashboard";
      if (type === "school") {
        redirectPath = "/admin";
      } else if (type === "teacher") {
        redirectPath = "/teacher/analytics";
      }

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
      
      // Make sure to reset loading state on error
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setIsResettingPassword(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?email_confirmed=true`,
      });

      if (error) {
        toast.error("Failed to send password reset email", {
          description: error.message
        });
      } else {
        toast.success("Password reset email sent", {
          description:
            "Please check your inbox and spam folder for the reset link.",
        });
      }
    } catch (error: any) {
      toast.error("An error occurred", {
        description: error.message
      });
    } finally {
      setIsResettingPassword(false);
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
                {loginError.includes("Email not confirmed") ? (
                  <div>
                    <p>Your email address has not been verified. Please check your inbox for the verification email.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={async () => {
                        try {
                          const { error } = await supabase.auth.resend({
                            type: "signup",
                            email,
                          });
                          
                          if (error) throw error;
                          
                          toast.success("Verification email sent", {
                            description: "Please check your inbox and spam folder."
                          });
                        } catch (err: any) {
                          toast.error("Failed to resend verification email", {
                            description: err.message
                          });
                        }
                      }}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Resend verification email
                    </Button>
                  </div>
                ) : loginError.includes("not registered") ? (
                  <div>
                    <p>{loginError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate("/register")}
                    >
                      Create an account
                    </Button>
                  </div>
                ) : loginError.includes("Invalid login credentials") ? (
                  "Invalid email or password. Please check your credentials and try again."
                ) : (
                  loginError
                )}
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
                  >
                    Admin Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("teacher")}
                    className="text-sm text-green-800 font-semibold hover:text-green-900 bg-green-100 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Teacher Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("student")}
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
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isResettingPassword}
                  className="text-sm text-learnable-blue hover:underline flex items-center"
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Forgot password?"
                  )}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
