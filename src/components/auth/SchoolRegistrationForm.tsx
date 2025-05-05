
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
  const [registrationError, setRegistrationError] = React.useState<string | null>(null);

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

  // Generate a random school code - uppercase alphanumeric, 8 characters
  const generateSchoolCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes similar looking characters
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log(`Generated school code: ${result}`);
    return result;
  };

  // Improved method to check if email exists
  const checkIfEmailExists = async (email: string): Promise<boolean> => {
    try {
      console.log(`Checking if email exists using auth API: ${email}`);
      
      // First method: Try to sign in with a random password
      // If we get "Invalid login credentials", email likely exists
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        // Use a completely random password instead of a fixed one 
        // This avoids any possibility of actually logging in
        password: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      });
      
      const emailExistsFromSignIn = signInError && signInError.message.includes("Invalid login credentials");
      console.log(`Sign-in check result: ${emailExistsFromSignIn ? "Email might exist" : "Email does not exist"}`);
      
      // Second method: Check profiles table
      console.log(`Checking profiles table for email: ${email}`);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_type, email')
        .ilike('email', email)
        .limit(1);
      
      if (profilesError) {
        console.error("Error checking profiles table:", profilesError);
      }
      
      const emailExistsInProfiles = profiles && profiles.length > 0;
      console.log(`Profiles check result: ${emailExistsInProfiles ? "Email exists in profiles" : "Email not found in profiles"}`);
      
      // If found in profiles, get the role
      if (emailExistsInProfiles && profiles && profiles.length > 0) {
        setExistingUserRole(profiles[0].user_type);
        console.log(`Found existing user role: ${profiles[0].user_type}`);
      }
      
      // Combine both checks
      const emailExists = emailExistsFromSignIn || emailExistsInProfiles;
      console.log(`Final email existence check result: ${emailExists ? "Email exists" : "Email does not exist"}`);
      
      return emailExists;
    } catch (error) {
      console.error("Error during email existence check:", error);
      // In case of error, safer to proceed and let the signup attempt fail if needed
      return false;
    }
  };

  const onSubmit = async (data: SchoolRegistrationFormValues) => {
    setIsLoading(true);
    setExistingEmailError(null);
    setExistingUserRole(null);
    setRegistrationError(null);
    
    try {
      // Display toast notification that registration is in progress
      const loadingToast = toast.loading("Registering your school...");
      
      console.log("Checking if email exists:", data.adminEmail);
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

      // Generate a school code
      const schoolCode = generateSchoolCode();
      console.log(`Generated school code for registration: ${schoolCode}`);
      
      // First create the entry in school_codes table
      const { error: schoolCodeInsertError } = await supabase
        .from("school_codes")
        .insert({
          code: schoolCode,
          school_name: data.schoolName,
          active: true
        });
      
      if (schoolCodeInsertError) {
        console.error("Error inserting school code:", schoolCodeInsertError);
        toast.dismiss(loadingToast);
        setRegistrationError("Failed to register school code: " + schoolCodeInsertError.message);
        toast.error("Failed to register school code");
        setIsLoading(false);
        return;
      }
      
      // Create the school record
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .insert({
          name: data.schoolName,
          code: schoolCode
        })
        .select()
        .single();
      
      if (schoolError || !schoolData) {
        console.error("Error creating school:", schoolError);
        toast.dismiss(loadingToast);
        
        // Clean up the school_code entry
        try {
          await supabase
            .from("school_codes")
            .delete()
            .eq("code", schoolCode);
          console.log("Cleaned up school_codes after failed school creation");
        } catch (cleanupError) {
          console.error("Error during cleanup of school_codes:", cleanupError);
        }
        
        setRegistrationError("Failed to create school record: " + (schoolError?.message || "Unknown error"));
        toast.error("Failed to create school record");
        setIsLoading(false);
        return;
      }
      
      const schoolId = schoolData.id;
      console.log(`School created with ID: ${schoolId}`);
      
      // Create the admin user with improved error handling
      console.log(`Creating admin user account for: ${data.adminEmail}`);
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          data: {
            full_name: data.adminFullName,
            user_type: "school",
            school_code: schoolCode,
            school_name: data.schoolName
          },
          emailRedirectTo: window.location.origin + "/login?email_confirmed=true"
        }
      });
      
      console.log(`Auth signup response:`, userData ? "Success" : "Failed", userError ? `Error: ${userError.message}` : "No error");
      
      if (userError || !userData || !userData.user) {
        console.error("Error creating admin user:", userError);
        toast.dismiss(loadingToast);
        
        // Clean up: remove school if user creation fails
        try {
          await supabase
            .from("schools")
            .delete()
            .eq("id", schoolId);
          
          await supabase
            .from("school_codes")
            .delete()
            .eq("code", schoolCode);
            
          console.log("Cleaned up school and code entries after user creation failed");
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
        }
        
        // Special handling for "already registered" errors
        if (userError?.message.includes("already registered")) {
          setExistingEmailError(data.adminEmail);
          toast.error(
            "Email already registered",
            {
              description: "This email address is already registered. Please use a different email address or try logging in.",
              duration: 8000,
              icon: <AlertCircle className="h-4 w-4" />,
            }
          );
        } else {
          setRegistrationError("Failed to create admin user account: " + (userError?.message || "Unknown error"));
          toast.error("Failed to create admin user account");
        }
        
        setIsLoading(false);
        return;
      }
      
      const adminUserId = userData.user.id;
      console.log(`Admin user created with ID: ${adminUserId}`);
      
      // Handle profile creation (this might be handled by a database trigger already)
      // but we'll create it explicitly to be sure
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: adminUserId,
          user_type: "school",
          full_name: data.adminFullName,
          school_code: schoolCode,
          school_name: data.schoolName,
          email: data.adminEmail // Add email to profile for easier lookups
        });
      
      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Continue despite profile error, as the handle_new_user trigger should handle this
      }
      
      // Create teacher record with supervisor privileges
      const { error: teacherError } = await supabase
        .from("teachers")
        .insert({
          id: adminUserId,
          school_id: schoolId,
          is_supervisor: true
        });
      
      if (teacherError) {
        console.error("Error creating teacher record:", teacherError);
        
        // Clean up: remove user if teacher record creation fails
        try {
          // Note: We can't delete auth users directly with the client, but we'll clean up the rest
          await supabase.from("profiles").delete().eq("id", adminUserId);
          await supabase.from("schools").delete().eq("id", schoolId);
          await supabase.from("school_codes").delete().eq("code", schoolCode);
          console.log("Cleaned up after teacher record creation failed");
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
        }
        
        toast.dismiss(loadingToast);
        setRegistrationError("Failed to create teacher admin record: " + teacherError.message);
        toast.error("Failed to create teacher admin record");
        setIsLoading(false);
        return;
      }

      // Dismiss the loading toast
      toast.dismiss(loadingToast);
      
      // Store the email and school code for potential later use
      setRegisteredEmail(data.adminEmail);
      setSchoolCode(schoolCode);
      
      // Set email sent state - assuming the signUp method sends a confirmation email
      setEmailSent(true);
      
      // Show success message with school details
      toast.success(
        `School "${data.schoolName}" successfully registered!`,
        {
          description: `Your school code is: ${schoolCode}. Please check your email to complete verification.`,
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

    } catch (error: any) {
      console.error("Unexpected error during registration:", error);
      setRegistrationError(error.message || "Unknown error during registration");
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
        
        {registrationError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Error</AlertTitle>
            <AlertDescription>
              {registrationError}
            </AlertDescription>
          </Alert>
        )}
        
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-800" />
          <AlertTitle className="text-blue-800">Email Verification Required</AlertTitle>
          <AlertDescription className="text-blue-700">
            After registration, you'll need to verify your email before accessing your school dashboard.
          </AlertDescription>
        </Alert>
        
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
