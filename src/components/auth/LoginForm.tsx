
import React, { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  
  // Check if we have a invitation token in the URL query params
  const searchParams = new URLSearchParams(location.search);
  const invitation = searchParams.get('invitation');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setLoginError(null);
    
    try {
      // Authenticate with Supabase
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.error("Login error:", error);
        throw new Error(error.message);
      }

      if (!authData.user) {
        throw new Error("Login failed. Please try again.");
      }

      console.log("Login successful:", authData);
      
      // Check if we need to handle a teacher invitation first
      if (invitation) {
        navigate(`/teacher-invitation/${invitation}`);
        return;
      }
      
      // Show success toast
      toast.success("Login successful");
      
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
      
      // Get user role directly from metadata for immediate routing
      const userType = authData.user.user_metadata?.user_type;
      
      if (userType === 'school_admin' || userType === 'school') {
        navigate("/admin", { replace: true });
      } else if (userType === 'teacher') {
        navigate("/teacher/analytics", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
      
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Login failed. Please try again.");
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success("Password reset instructions sent to your email");
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(error.message || "Failed to send reset instructions");
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
