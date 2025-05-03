
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail, AlertTriangle, Info, AlertCircle } from "lucide-react";
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
  const [existingEmailError, setExistingEmailError] = React.useState<string | null>(null);
  const [existingUserRole, setExistingUserRole] = React.useState<string | null>(null);

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
        toast.error("Failed to send verification email: " + error.message);
      } else {
        toast.success("Verification email sent. Please check your inbox and spam folder.");
      }
    } catch (error: any) {
      toast.error("An error occurred: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmailExistingRole = async (email: string): Promise<string | null> => {
    try {
      // Try to get the user's role from the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .ilike('id', `%${email}%`) // This is a workaround since we can't directly query by email
        .limit(1);
      
      if (error) {
        console.error("Error checking user role:", error);
        return null;
      }
      
      if (data && data.length > 0 && data[0].user_type) {
        // Return the role name with proper capitalization for display
        const role = data[0].user_type;
        switch (role) {
          case 'school':
            return 'School Administrator';
          case 'teacher':
            return 'Teacher';
          case 'student':
            return 'Student';
          default:
            return role.charAt(0).toUpperCase() + role.slice(1);
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error checking email role:", error);
      return null;
    }
  };

  const checkIfEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Try a sign-in attempt to check if the email exists
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: "dummy-password-for-check-only",
      });

      // If there's no error or the error is not about invalid credentials, email might exist
      const emailExists = !signInError || (signInError && !signInError.message.includes("Invalid login credentials"));
      
      // If we think the email exists, double-check by querying the profiles table
      if (emailExists) {
        // Try to get the user's role
        const userRole = await checkEmailExistingRole(email);
        if (userRole) {
          setExistingUserRole(userRole);
        }
        
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking email existence:", error);
      // In case of error, safer to assume it might exist
      return false;
    }
  };

  const onSubmit = async (data: SchoolRegistrationFormValues) => {
    setIsLoading(true);
    setExistingEmailError(null);
    setExistingUserRole(null);
    
    try {
      // Display toast notification that registration is in progress
      const loadingToast = toast.loading("Registering your school...");
      
      // Check if email already exists
      const emailExists = await checkIfEmailExists(data.adminEmail);
      
      if (emailExists) {
        toast.dismiss(loadingToast);
        setExistingEmailError(data.adminEmail);
        
        const roleMessage = existingUserRole 
          ? `This email is already registered as a ${existingUserRole}`
          : "This email is already registered";
          
        toast.error(
          roleMessage,
          {
            description: "Please use a different email address. Each user can only have one role in the system.",
            duration: 8000,
            icon: <AlertCircle className="h-5 w-5" />,
          }
        );
        setIsLoading(false);
        return;
      }
      
      // Call our edge function to register the school
      const response = await supabase.functions.invoke<{
        success?: boolean;
        error?: string;
        details?: string;
        schoolId?: string;
        schoolCode?: string;
        adminUserId?: string;
        emailSent?: boolean;
        emailError?: string | null;
        message?: string;
      }>("register-school", {
        body: {
          schoolName: data.schoolName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          adminFullName: data.adminFullName,
        },
      });
      
      // Dismiss the loading toast
      toast.dismiss(loadingToast);
      
      const { data: responseData, error } = response;

      if (error) {
        console.error("School registration error:", error);
        
        // Check if this is an "email already exists" error
        const errorMessage = error.message || "";
        if (errorMessage.includes("non-2xx status code") || errorMessage.includes("already registered")) {
          // Try to get the role for this existing email
          const userRole = await checkEmailExistingRole(data.adminEmail);
          setExistingUserRole(userRole);
          
          // Set the existing email error to guide the user
          setExistingEmailError(data.adminEmail);
          
          const roleMessage = userRole 
            ? `This email is already registered as a ${userRole}`
            : "This email is already registered";
            
          toast.error(
            roleMessage,
            {
              description: "Please use a different email address. Each user can only have one role in the system.",
              duration: 8000,
              icon: <AlertCircle className="h-5 w-5" />,
            }
          );
        } else {
          toast.error(`Registration failed: ${error.message || "Unknown error"}`);
        }
        setIsLoading(false);
        return;
      }

      if (responseData?.error) {
        console.error("Server error:", responseData.error, responseData.details);
        
        // Handle specific error cases
        if (responseData.error === "Email already registered" || 
            (responseData.details && responseData.details.includes("already registered"))) {
          
          // Try to get the role for this existing email
          const userRole = await checkEmailExistingRole(data.adminEmail);
          setExistingUserRole(userRole);
          
          setExistingEmailError(data.adminEmail);
          
          const roleMessage = userRole 
            ? `This email is already registered as a ${userRole}`
            : "This email is already registered";
            
          toast.error(
            roleMessage,
            {
              description: "Please use a different email address. Each user can only have one role in the system.",
              duration: 8000,
              icon: <AlertCircle className="h-5 w-5" />,
            }
          );
        } else {
          toast.error(`Registration failed: ${responseData.error}`);
        }
        setIsLoading(false);
        return;
      }

      if (responseData?.success) {
        // Store the email and school code for potential later use
        setRegisteredEmail(data.adminEmail);
        setSchoolCode(responseData.schoolCode);
        
        // Set email sent state - with auto-confirmation we can go straight to login
        setEmailSent(true);
        
        // Show success message with school details
        toast.success(
          `School "${data.schoolName}" successfully registered!`,
          {
            description: `Your school code is: ${responseData.schoolCode}. Please save this code - you will need it to add teachers and students to your school.`,
            duration: 10000, // Show for 10 seconds
          }
        );
        
        // Actually log the user in immediately if possible
        try {
          console.log("Attempting to sign in user after registration");
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: data.adminEmail,
            password: data.adminPassword
          });
          
          if (signInError) {
            console.warn("Auto sign-in failed, redirecting to login:", signInError);
            // Auto navigate to login after 3 seconds
            setTimeout(() => {
              navigate('/login', { 
                state: { 
                  registeredEmail: data.adminEmail,
                  schoolCode: responseData.schoolCode 
                } 
              });
            }, 3000);
          } else {
            console.log("Auto sign-in successful, redirecting to admin");
            // Redirect to admin dashboard
            setTimeout(() => {
              navigate('/admin');
            }, 3000);
          }
        } catch (signInError) {
          console.error("Error during auto sign-in:", signInError);
          // Fall back to redirecting to login
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } else {
        toast.error(`Registration failed: ${responseData?.error || "Unknown error"}`);
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
          <h2 className="text-2xl font-semibold mb-3 gradient-text">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your school has been successfully registered. You can now log in with your email and password.
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
              variant="default" 
              className="w-full gradient-bg" 
              onClick={() => navigate("/login")}
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6 text-center gradient-text">Register Your School</h2>
        
        {existingEmailError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{existingUserRole ? `Email Already Registered as ${existingUserRole}` : 'Email Already Registered'}</AlertTitle>
            <AlertDescription>
              The email address "{existingEmailError}" is already registered
              {existingUserRole ? ` as a ${existingUserRole} account` : ''}.
              Please use a different email or <a href="/login" className="font-medium underline">login</a> if this is your account.
              Each user can only have one role in the system.
            </AlertDescription>
          </Alert>
        )}
        
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
