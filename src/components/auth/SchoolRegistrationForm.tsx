import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
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
import { Loader2, AlertCircle, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [existingRole, setExistingRole] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const navigate = useNavigate();

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

  const resendVerificationEmail = async (email: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.functions.invoke('resend-verification', {
        body: { email }
      });

      if (error) {
        toast.error("Failed to resend verification email", { description: error.message });
        return;
      }

      toast.success("Verification email sent", { description: `A new verification email has been sent to ${email}` });
    } catch (err: any) {
      toast.error("Failed to resend verification email", { description: err?.message || "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: SchoolFormValues) => {
    clearErrors();
    setIsLoading(true);
    try {
      // Call your Supabase Edge Function to register school
      try {
        const { data, error } = await supabase.functions.invoke('register-school', {
          body: {
            schoolName: values.schoolName,
            adminEmail: values.adminEmail,
            adminPassword: values.adminPassword,
            adminFullName: values.adminFullName,
          },
        });

        if (error) {
          // Handle known error cases, e.g. email already registered
          setIsLoading(false);
          
          // If we have a response with an error message
          if (error.message?.includes("Email already registered") || 
              (error.message?.includes("non-2xx status code") && 
               error.message?.includes("409"))) {
            setEmailError(values.adminEmail);
            toast.error("Email already registered", {
              description: "Please use a different email address or login."
            });
            return;
          }
          
          // For other errors
          setServerError(error.message || "Registration failed");
          toast.error("Registration failed", {
            description: error.message || "Please try again."
          });
          return;
        }

        setRegistrationSuccess(true);
        setVerificationEmail(values.adminEmail);
        toast.success("Registration successful!", {
          description: "Please check your email to verify your account."
        });
      } catch (invokeError: any) {
        console.error("Edge function invoke error:", invokeError);
        
        // Try to parse the response data from the error
        let errorMessage = "Registration failed";
        try {
          // Check if there's information in the error that we can extract
          const errorBody = invokeError.message || '';
          if (errorBody.includes("Email already registered") || 
              errorBody.includes("already registered")) {
            setEmailError(values.adminEmail);
            errorMessage = "Email already registered";
            toast.error("Email already registered", {
              description: "Please use a different email address or login."
            });
            return;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        
        setServerError(errorMessage);
        toast.error(errorMessage, { description: "Please try again." });
      }
    } catch (err: any) {
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
          <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification email to <strong>{verificationEmail}</strong>
          </p>
          <p className="text-gray-500 mb-3 max-w-md">
            Please check your inbox and click the verification link to activate your account.
          </p>
          <p className="text-amber-600 mb-8 max-w-md font-medium">
            You must verify your email before logging in. Check your spam folder if necessary.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/login")}>Go to Login</Button>
            <Button onClick={() => { setRegistrationSuccess(false); form.reset(); }}>
              Register Another School
            </Button>
          </div>
          <div className="mt-6">
            <Button variant="link" onClick={() => resendVerificationEmail(verificationEmail)} disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Didn't receive an email? Send again"}
            </Button>
          </div>
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
