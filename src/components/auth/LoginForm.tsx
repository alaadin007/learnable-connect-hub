
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { isTestAccount } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { resendVerificationEmail, requestPasswordReset } from "@/utils/authHelpers";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

const LoginForm = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [emailForActions, setEmailForActions] = useState("");
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setEmailForActions(values.email); // Save email for verification resend
    
    try {
      await signIn(values.email, values.password);
      
      const isTest = isTestAccount(values.email);
      
      if (isTest) {
        console.log("Test account detected, redirecting to dashboard");
        navigate("/dashboard");
      } else {
        console.log("Successful login, redirecting to dashboard");
        navigate("/dashboard");
      }
    } catch (error: any) {
      // Check specifically for email verification errors
      if (error.message?.includes("Email not verified") || 
          error.message?.includes("Email not confirmed") || 
          error.message?.includes("not verified")) {
        setShowVerificationAlert(true);
        toast.error("Email address not verified. Please check your inbox for a verification link.");
      } else {
        toast.error(error.message || "Failed to sign in");
      }
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!emailForActions) {
      toast.error("Please enter your email address first");
      return;
    }
    
    setIsResendingVerification(true);
    try {
      const result = await resendVerificationEmail(emailForActions);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error("Failed to resend verification email");
      console.error("Verification resend error:", error);
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!emailForActions) {
      toast.error("Please enter your email address first");
      return;
    }
    
    setIsRequestingReset(true);
    try {
      const result = await requestPasswordReset(emailForActions);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error("Failed to send password reset email");
      console.error("Password reset error:", error);
    } finally {
      setIsRequestingReset(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-learnable-light">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold gradient-text">Login</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showVerificationAlert && (
          <Alert variant="warning" className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Email not verified</AlertTitle>
            <AlertDescription className="text-amber-700">
              Please check your inbox for a verification link or
              <Button 
                variant="link" 
                className="px-1 text-amber-700 font-semibold underline hover:text-amber-900"
                onClick={handleResendVerification}
                disabled={isResendingVerification}
              >
                {isResendingVerification ? 'Sending...' : 'click here to resend'}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="you@example.com" 
                      type="email" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        setEmailForActions(e.target.value);
                      }}
                    />
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
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              ) : (
                <>Sign In</>
              )}
            </Button>
          </form>
        </Form>
        
        <div className="text-sm text-center space-y-2">
          <Button 
            variant="link" 
            className="text-learnable-blue hover:text-learnable-purple p-0"
            onClick={handlePasswordReset}
            disabled={isRequestingReset}
          >
            {isRequestingReset ? 'Sending...' : 'Forgot password?'}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center w-full">
          Don't have an account?{" "}
          <Link to="/register" className="text-learnable-blue hover:text-learnable-purple font-semibold">
            Register
          </Link>
        </div>
        <div className="text-sm text-center w-full">
          <Link to="/school-registration" className="flex items-center justify-center text-learnable-blue hover:text-learnable-purple font-semibold">
            <span>Register your school</span>
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
