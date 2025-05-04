
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, Mail, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { resendVerificationEmail } from "@/utils/authHelpers";

const schoolFormSchema = z
  .object({
    schoolName: z.string().min(2, { message: "School name must be at least 2 characters." }),
    adminFullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    adminEmail: z.string().email({ message: "Please enter a valid email address." }),
    adminPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SchoolFormValues = z.infer<typeof schoolFormSchema>;

const SchoolRegistrationForm = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [existingRole, setExistingRole] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [completingRegistration, setCompletingRegistration] = useState(false);
  const navigate = useNavigate();

  // Parse URL parameters for registration completion
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const completeReg = searchParams.get("completeRegistration");
    const userId = searchParams.get("userId");
    
    if (completeReg === "true" && userId) {
      handleCompleteRegistration(userId);
    }
  }, [location.search]);

  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      schoolName: "",
      adminFullName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
    },
  });

  const clearErrors = () => {
    setServerError(null);
    setEmailError(null);
    setExistingRole(null);
  };

  const handleCompleteRegistration = async (userId: string) => {
    setCompletingRegistration(true);
    try {
      console.log("Completing registration for user:", userId);
      
      const response = await supabase.functions.invoke('complete-registration', {
        body: { userId }
      });

      console.log("Response from complete-registration:", response);

      if (response.error) {
        console.error("Error from complete-registration function:", response.error);
        toast.error("Failed to complete registration", { 
          description: response.error.message || "Please try again later" 
        });
        return;
      }

      if (response.data && response.data.error) {
        console.error("Error from response data:", response.data.error);
        toast.error("Failed to complete registration", { 
          description: response.data.error || "Please try again later" 
        });
        return;
      }

      toast.success("Registration completed successfully", { 
        description: "Your school has been registered. You can now log in." 
      });
      
      setTimeout(() => {
        navigate("/login");
      }, 1500);
      
    } catch (err: any) {
      console.error("Exception in handleCompleteRegistration:", err);
      toast.error("Failed to complete registration", { 
        description: err?.message || "An unexpected error occurred" 
      });
    } finally {
      setCompletingRegistration(false);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      setResendingEmail(true);
      setResendSuccess(false);
      console.log("Attempting to resend verification email to:", email);
      
      const response = await supabase.functions.invoke('resend-verification', {
        body: { email }
      });

      console.log("Response from resend-verification:", response);

      if (response.error) {
        console.error("Error from resend-verification function:", response.error);
        toast.error("Failed to resend verification email", { 
          description: response.error.message || "Please try again later" 
        });
        return;
      }

      if (response.data && response.data.error) {
        console.error("Error from response data:", response.data.error);
        toast.error("Failed to resend verification email", { 
          description: response.data.error || "Please try again later" 
        });
        return;
      }

      if (response.data && response.data.already_verified) {
        toast.info("Email already verified", { 
          description: "You can now complete your registration" 
        });
        setResendSuccess(true);
        
        if (registeredUserId) {
          handleCompleteRegistration(registeredUserId);
        }
        return;
      }

      setResendSuccess(true);
      toast.success("Verification email sent", { 
        description: `A new verification email has been sent to ${email}` 
      });
    } catch (err: any) {
      console.error("Exception in resendVerificationEmail:", err);
      toast.error("Failed to resend verification email", { 
        description: err?.message || "An unexpected error occurred" 
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const onSubmit = async (values: SchoolFormValues) => {
    clearErrors();
    setIsLoading(true);
    try {
      console.log("Submitting registration form...", values);
      
      const response = await supabase.functions.invoke('register-school', {
        body: {
          schoolName: values.schoolName,
          adminEmail: values.adminEmail,
          adminPassword: values.adminPassword,
          adminFullName: values.adminFullName,
        },
      });

      console.log("Response from register-school:", response);

      // Check if there was an error calling the function
      if (response.error) {
        const errorMsg = response.error.message || "Registration failed";
        console.error("Function invoke error:", errorMsg);
        
        // Check if this is a 409 Conflict error (email already exists)
        if (errorMsg.includes("409") || errorMsg.toLowerCase().includes("already registered") || errorMsg.toLowerCase().includes("already exists")) {
          setEmailError(values.adminEmail);
          toast.error("Email already registered", {
            description: "Please use a different email address or login."
          });
        } else {
          setServerError(errorMsg);
          toast.error("Registration failed", {
            description: errorMsg
          });
        }
        return;
      }

      // Check if there's an error in the response data
      if (response.data && response.data.error) {
        const dataErrorMsg = response.data.error;
        console.error("Response data error:", dataErrorMsg);
        
        if (dataErrorMsg.toLowerCase().includes("email already registered") || dataErrorMsg.toLowerCase().includes("already exists")) {
          setEmailError(values.adminEmail);
          toast.error("Email already registered", {
            description: "Please use a different email address or login."
          });
        } else {
          setServerError(dataErrorMsg);
          toast.error("Registration failed", {
            description: dataErrorMsg
          });
        }
        return;
      }

      // If we got here, the registration was initiated successfully
      setRegistrationSuccess(true);
      setVerificationEmail(values.adminEmail);
      setRegisteredUserId(response.data.userId);
      toast.success("Registration initiated!", {
        description: "Please check your email and verify your account to complete registration."
      });
      
    } catch (err: any) {
      console.error("Exception in onSubmit:", err);
      setServerError(err.message || "An unexpected error occurred");
      toast.error("Registration failed", {
        description: err.message || "Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6 flex flex-col items-center text-center py-10">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <Mail className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            A verification email has been sent to <strong>{verificationEmail}</strong>
          </p>
          <p className="text-gray-500 mb-3 max-w-md">
            Please click the verification link in your email to complete your registration.
            Once verified, you can log in to your school admin account.
          </p>
          
          <Alert className="mb-6 max-w-md">
            <AlertTitle className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Important
            </AlertTitle>
            <AlertDescription>
              You must verify your email before you can access your account.
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <Button 
              variant="outline" 
              onClick={() => resendVerificationEmail(verificationEmail)}
              disabled={resendingEmail || resendSuccess}
              className="w-full"
            >
              {resendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : resendSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Email Sent
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>
            
            <Button 
              onClick={() => navigate("/login")} 
              variant="secondary"
              className="w-full"
            >
              Go to Login
            </Button>
            
            <Button 
              variant="link" 
              onClick={() => {
                setRegistrationSuccess(false);
                form.reset();
              }}
            >
              Register Another School
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (completingRegistration) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6 flex flex-col items-center text-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Completing Registration</h2>
          <p className="text-gray-600">
            Please wait while we complete your registration...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="pt-6">
        {serverError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Error</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {emailError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {existingRole ? `Email Registered as ${existingRole}` : "Email Already Registered"}
            </AlertTitle>
            <AlertDescription>
              The email {`"${emailError}" `}is already registered
              {existingRole ? ` as ${existingRole}` : ""}. Please use a different email or{" "}
              <Link to="/login" className="font-medium underline">login</Link>.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter school name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminFullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@school.edu"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        clearErrors();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="adminPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormDescription>At least 8 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full gradient-bg"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register School"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SchoolRegistrationForm;
