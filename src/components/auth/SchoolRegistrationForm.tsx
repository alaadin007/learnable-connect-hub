
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define form schema with validations
const schoolRegistrationSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters"),
  adminFullName: z.string().min(3, "Full name must be at least 3 characters"),
  adminEmail: z.string().email("Please enter a valid email address"),
  adminPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).*$/,
      "Password must contain at least one letter and one number"
    ),
  confirmPassword: z.string(),
}).refine(data => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], 
});

type SchoolRegistrationFormValues = z.infer<typeof schoolRegistrationSchema>;

const SchoolRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [schoolCode, setSchoolCode] = React.useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);

  // Initialize form
  const form = useForm<SchoolRegistrationFormValues>({
    resolver: zodResolver(schoolRegistrationSchema),
    defaultValues: {
      schoolName: "",
      adminFullName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
    },
  });

  const handleResetPassword = async () => {
    if (!registeredEmail) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(registeredEmail, {
        redirectTo: window.location.origin + "/login?email_confirmed=true",
      });
      
      if (error) {
        toast.error("Failed to send password reset email: " + error.message);
      } else {
        toast.success("Password reset email sent. Please check your inbox and spam folder.");
      }
    } catch (error: any) {
      toast.error("An error occurred: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SchoolRegistrationFormValues) => {
    setIsLoading(true);
    
    try {
      // Display toast notification that registration is in progress
      const loadingToast = toast.loading("Registering your school...");
      
      // Call our edge function to register the school
      const { data: responseData, error } = await supabase.functions.invoke("register-school", {
        body: {
          schoolName: data.schoolName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          adminFullName: data.adminFullName,
        },
      });

      // Dismiss the loading toast
      toast.dismiss(loadingToast);

      if (error) {
        console.error("School registration error:", error);
        toast.error(`Registration failed: ${error.message || "Unknown error"}`);
        return;
      }

      if (responseData.success) {
        // Store the email and school code for potential later use
        setRegisteredEmail(data.adminEmail);
        setSchoolCode(responseData.schoolCode);
        
        // Set email sent state
        setEmailSent(true);
        
        // Show success message with school details and clear confirmation about email
        toast.success(
          `School "${data.schoolName}" successfully registered!`,
          {
            description: `Your school code is: ${responseData.schoolCode}. ${responseData.emailSent ? 
              "Please check your email to complete verification." : 
              "There was an issue sending the verification email. You can request another one below."}`,
            duration: 10000, // Show for 10 seconds
          }
        );
        
        // We don't auto-login since email needs to be verified first
        toast.info(
          "Email verification required",
          {
            description: "Please check your inbox and spam folders for the verification email. If you don't receive it within a few minutes, you can request another verification email using the button below.",
            duration: 15000,
            icon: <Mail className="h-4 w-4" />,
          }
        );
        
        // If email wasn't sent successfully, show a warning
        if (!responseData.emailSent) {
          toast.warning(
            "Email delivery issue",
            {
              description: "We couldn't confirm if the verification email was sent successfully. If you don't receive it, please use the 'Request Verification Email' button on the next screen.",
              duration: 10000,
              icon: <AlertTriangle className="h-4 w-4" />,
            }
          );
        }
      } else {
        toast.error(`Registration failed: ${responseData.error || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(`An unexpected error occurred: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show a different UI when email has been sent
  if (emailSent) {
    return (
      <div className="w-full max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="bg-green-100 text-green-800 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-3 gradient-text">Check Your Email</h2>
          <p className="text-gray-600 mb-4">
            We've sent a verification link to your email address. Please check your inbox and spam folder and verify your account to continue.
          </p>
          
          {schoolCode && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertTitle className="text-amber-800">Important: Save Your School Code</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your school code is: <span className="font-bold">{schoolCode}</span>
                <br />
                Please save this code - you'll need it to add teachers and students to your school.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate("/login")}
            >
              Go to Login
            </Button>
            
            {registeredEmail && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Request Verification Email Again"
                )}
              </Button>
            )}
            
            <p className="text-sm text-gray-500">
              If you don't receive an email, check your spam folder or request another verification email using the button above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6 text-center gradient-text">Register Your School</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Input placeholder="Enter admin's full name" {...field} />
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
                    <Input type="email" placeholder="admin@school.edu" {...field} />
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
                  <FormLabel>Admin Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
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
            
            <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
              <Mail className="h-4 w-4" />
              <AlertTitle>Email Verification Required</AlertTitle>
              <AlertDescription>
                You'll need to verify your email address after registration. Please use an email you can access.
              </AlertDescription>
            </Alert>
            
            <Button type="submit" disabled={isLoading} className="w-full gradient-bg">
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
      </div>
    </div>
  );
};

export default SchoolRegistrationForm;
