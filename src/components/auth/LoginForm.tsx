import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase, checkSupabaseConnection } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type FormData = z.infer<typeof formSchema>;

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { signIn, user, userRole, session, connectionError } = useAuth();
  
  // Check if we have a invitation token in the URL query params
  const searchParams = new URLSearchParams(location.search);
  const invitation = searchParams.get('invitation');

  // Monitor authentication state and redirect if already logged in
  useEffect(() => {
    if (user && session) {
      const redirectPath = getRedirectPath();
      console.log(`Already authenticated as ${userRole}, redirecting to ${redirectPath}`);
      navigate(redirectPath, { replace: true });
    }
  }, [user, session, userRole, navigate]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const getRedirectPath = () => {
    // Handle invitation flow first
    if (invitation) {
      return `/teacher-invitation/${invitation}`;
    }
    
    // Otherwise route based on role
    if (userRole === "school" || userRole === "school_admin") {
      return "/admin";
    } else if (userRole === "teacher") {
      return "/teacher/analytics";
    } else {
      return "/dashboard";
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setLoginError(null);
    
    // Check database connection first
    try {
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        setLoginError("Cannot connect to the authentication service. Please try again later.");
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error("Connection check error:", error);
    }
    
    try {
      // Use the signIn method from AuthContext
      const { data: authData, error } = await signIn(data.email, data.password);

      if (error) {
        console.error("Login error:", error);
        throw new Error(error.message);
      }

      if (!authData?.user) {
        throw new Error("Login failed. No user returned.");
      }

      console.log("Login successful:", authData);
      toast.success("Login Successful");
      
      // Call the verify-and-setup-user function to ensure proper setup
      try {
        const { error: verifyError } = await supabase.functions.invoke('verify-and-setup-user');
        if (verifyError) {
          console.warn("User verification warning:", verifyError);
          // Continue anyway - verification not critical for login
        }
      } catch (verifyErr) {
        console.warn("User verification failed:", verifyErr);
        // Continue anyway - verification not critical for login
      }
      
      // Navigation will be handled by the useEffect in this component
      // or by the Login page component's useEffect which monitors auth state
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Login failed. Please try again.");
      toast.error("Login Failed", {
        description: error.message || "Login failed. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast.error("Email Required", {
        description: "Please enter your email address first"
      });
      return;
    }
    
    // Check connection first
    try {
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        toast.error("Connection Error", {
          description: "Cannot connect to the authentication service. Please try again later."
        });
        return;
      }
    } catch (error) {
      console.error("Connection check error:", error);
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success("Reset Instructions Sent", {
        description: "Password reset instructions sent to your email"
      });
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error("Reset Failed", {
        description: error.message || "Failed to send reset instructions"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-4">Login</h1>
        
        {loginError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loginError}</AlertDescription>
          </Alert>
        )}

        {connectionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Database connection issues detected. This application requires database connectivity to function.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="******" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex items-center justify-between">
          <Button 
            type="button" 
            variant="link" 
            className="p-0 h-auto text-primary"
            onClick={handleResetPassword}
            disabled={isLoading}
          >
            Forgot password?
          </Button>
        </div>
        
        <Button 
          type="submit" 
          className="w-full gradient-bg" 
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
        
        <p className="text-center text-sm">
          Don't have an account?{" "}
          <Button
            variant="link"
            className="p-0 h-auto text-primary"
            onClick={() => navigate("/register")}
          >
            Register
          </Button>
        </p>
      </form>
    </Form>
  );
};

export default LoginForm;
