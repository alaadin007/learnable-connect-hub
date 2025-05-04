
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "sonner";
import { ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

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
                toast.success("Registration completed!", { 
                  description: "Your school has been registered successfully."
                });
                
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
    
    try {
      await signIn(email, password);
      // No need to navigate - the auth context will handle redirection
    } catch (error: any) {
      console.error("Login error:", error);
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success("Password reset email sent", {
        description: "Please check your inbox for instructions"
      });
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
        toast.info("Email already verified", {
          description: "You can now log in with your credentials."
        });
        return;
      }
      
      toast.success("Verification email sent", {
        description: "Please check your inbox and spam folder."
      });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      toast.error(error.message || "Failed to resend verification email");
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 gradient-text">Log in</h1>
            <p className="text-gray-600">
              Welcome back to LearnAble. Log in to continue helping students learn.
            </p>
          </div>
          
          <Card className="w-full shadow-md border-learnable-light">
            <CardHeader className="text-center">
              <h2 className="text-2xl font-bold text-gray-800">Login</h2>
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
                  className="w-full gradient-bg"
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
                    className="text-learnable-blue hover:text-learnable-purple p-0"
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </Button>
                </div>
              </form>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-2">
              <div className="w-full text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-learnable-blue hover:text-learnable-purple font-semibold">
                    Register
                  </Link>
                </p>
              </div>
              
              <div className="w-full text-center">
                <Link to="/school-registration" className="flex items-center justify-center text-learnable-blue hover:text-learnable-purple font-semibold text-sm">
                  <span>Register your school</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
              
              <div className="w-full text-center mt-2">
                <Button 
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-gray-600 hover:text-learnable-blue p-0 text-xs"
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
