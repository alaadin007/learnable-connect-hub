
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";
import { ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, user, isLoading: authLoading, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Redirect if already authenticated - with a delay to ensure auth check is complete
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Wait for auth loading to complete
        if (!authLoading && user) {
          // Redirect based on user role
          if (profile?.user_type === "school") {
            console.log("Login: Detected school admin, redirecting to admin dashboard");
            navigate('/admin', { replace: true });
          } else if (profile?.user_type === "teacher") {
            console.log("Login: Detected teacher, redirecting to teacher dashboard");
            navigate('/teacher/analytics', { replace: true });
          } else {
            console.log("Login: Detected regular user, redirecting to dashboard");
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
      } finally {
        setAuthCheckComplete(true);
      }
    };

    // Only run the check if auth loading is complete
    if (!authLoading) {
      checkAuthStatus();
    }
  }, [user, authLoading, navigate, profile]);

  useEffect(() => {
    // Debug logging for the login page
    console.log("Login page state:", {
      authLoading,
      userExists: !!user,
      profileType: profile?.user_type,
      authCheckComplete
    });
  }, [authLoading, user, profile, authCheckComplete]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const registered = searchParams.get("registered");
    const emailVerificationFailed = searchParams.get("emailVerificationFailed");
    const completeRegistration = searchParams.get("completeRegistration");
    
    if (registered === "true") {
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
      });
    }
    
    if (emailVerificationFailed === "true") {
      toast.error("Email verification failed", {
        description: "Please try again or request a new verification email."
      });
    }
    
    const handleEmailConfirmation = async () => {
      if (completeRegistration === "true") {
        setProcessing(true);
        try {
          console.log("Checking session for completeRegistration");
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user?.email_confirmed_at) {
            console.log("User is verified and has a session");
            
            try {
              const userId = session.user.id;
              toast.loading("Finalizing your registration...");
              
              console.log("Calling complete-registration function with userId:", userId);
              const response = await supabase.functions.invoke('complete-registration', {
                body: { userId }
              });
              
              console.log("Response from complete-registration:", response);
              
              if (response.error) {
                console.error("Error completing registration:", response.error);
                toast.error("Registration completion failed", { 
                  description: response.error.message
                });
                setProcessing(false);
                return;
              }
              
              if (response.data && response.data.success) {
                toast.success("Registration completed!");
                
                setTimeout(() => {
                  setProcessing(false);
                  navigate("/");
                }, 1500);
              }
            } catch (error) {
              console.error("Error completing registration:", error);
              toast.error("Failed to complete registration");
              setProcessing(false);
            }
          } else {
            console.log("User is either not verified or doesn't have a session");
            setProcessing(false);
          }
        } catch (error) {
          console.error("Error in email confirmation process:", error);
          setProcessing(false);
        }
      }
    };
    
    handleEmailConfirmation();
  }, [location.search, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      console.log("Login: Attempting to sign in");
      await signIn(email, password);
      // Auth context will handle redirection based on user role
    } catch (error: any) {
      console.error("Login error:", error);
      // Enhanced error handling
      if (error.message?.includes("Invalid login credentials")) {
        setErrorMessage("Incorrect email or password. Please try again.");
      } else {
        setErrorMessage(error.message || "Failed to sign in");
      }
      toast.error(error.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    try {
      const toastId = toast.loading("Sending password reset email...");
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      toast.dismiss(toastId);
      
      if (error) throw error;
      
      toast.success("Password reset email sent");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(error.message || "Failed to send reset email");
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    try {
      const toastId = toast.loading("Sending verification email...");
      const currentUrl = window.location.origin;
      
      const { data, error } = await supabase.functions.invoke("resend-verification", {
        body: { email, currentUrl }
      });
      
      toast.dismiss(toastId);
      
      if (error || (data && data.error)) {
        throw new Error(error?.message || data?.error || "Failed to resend verification");
      }
      
      if (data && data.already_verified) {
        toast.info("Email already verified");
        return;
      }
      
      toast.success("Verification email sent");
    } catch (error: any) {
      console.error("Resend verification error:", error);
      toast.error(error.message || "Failed to resend verification email");
    }
  };

  // Handle the test login functionality directly from the login page
  const handleTestLogin = (accountType: "school" | "teacher" | "student") => {
    const { setTestUser } = useAuth();
    
    try {
      // For test accounts, we skip the loading state
      setTestUser(accountType);
      // The setTestUser function will handle navigation
    } catch (error: any) {
      console.error("Test login error:", error);
      toast.error(`Failed to log in as test ${accountType}: ${error.message}`);
    }
  };

  if (processing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
          <div className="text-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-learnable-purple" />
            <p>Processing your verification...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we complete your registration.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
          <div className="text-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-learnable-purple" />
            <p>Checking authentication status...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-gray-800">Log in</h1>
            <p className="text-gray-600">
              Welcome back to LearnAble. Log in to continue helping students learn.
            </p>
          </div>
          
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md">
              <p className="text-sm">
                <strong>Error:</strong> {errorMessage}
              </p>
            </div>
          )}
          
          <Card className="w-full shadow-md border-learnable-light">
            <CardHeader className="text-center">
              <h2 className="text-xl font-bold text-gray-800">Login</h2>
              <p className="text-sm text-gray-600">Enter your email and password to access your account</p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : 'Sign In'}
                </Button>
                
                <div className="text-center">
                  <Button 
                    type="button" 
                    variant="link" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-800 p-0"
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </Button>
                </div>
              </form>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-center text-sm text-gray-600 mb-2">Quick access with test accounts:</p>
                <div className="flex justify-center gap-2">
                  <Button 
                    type="button" 
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestLogin("school")}
                    className="text-xs"
                  >
                    School Admin
                  </Button>
                  <Button 
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestLogin("teacher")}
                    className="text-xs"
                  >
                    Teacher
                  </Button>
                  <Button 
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestLogin("student")}
                    className="text-xs"
                  >
                    Student
                  </Button>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-2">
              <div className="w-full text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-blue-600 hover:text-blue-800 font-semibold">
                    Register
                  </Link>
                </p>
              </div>
              
              <div className="w-full text-center">
                <Link to="/school-registration" className="flex items-center justify-center text-blue-600 hover:text-blue-700 font-semibold text-sm">
                  <span>Register your school</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
              
              <div className="w-full text-center mt-2">
                <Button 
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-gray-600 hover:text-blue-600 p-0 text-xs"
                  onClick={handleResendVerification}
                >
                  Didn't receive verification email?
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default Login;
