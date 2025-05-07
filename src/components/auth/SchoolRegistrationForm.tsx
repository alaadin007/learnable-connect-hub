
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail, AlertCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/contexts/RBACContext";

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
import {
  checkEmailExists,
  createUserProfile,
  assignUserRole,
  handleRegistrationError
} from "@/utils/authHelpers";

// Schema definition & validation using zod
const schoolRegistrationSchema = z
  .object({
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
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
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

  // Generate random uppercase alphanumeric school code (exclude confusing chars)
  const generateSchoolCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const onSubmit = async (data: SchoolRegistrationFormValues) => {
    setIsLoading(true);
    const loadingToast = toast.loading("Registering your school...");

    try {
      // Check if email exists
      const emailExists = await checkEmailExists(data.adminEmail);
      if (emailExists) {
        toast.dismiss(loadingToast);
        toast.error("Email already registered", {
          description: "Please use a different email address. Each user can only have one role in the system.",
          duration: 8000,
          icon: <AlertCircle className="h-5 w-5" />,
        });
        setIsLoading(false);
        return;
      }

      const newSchoolCode = generateSchoolCode();
      console.log("Generated school code:", newSchoolCode);

      // Register user with Supabase auth first
      const { data: authData, error: userError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          data: {
            full_name: data.adminFullName,
            user_type: "school_admin",
            school_code: newSchoolCode,
            school_name: data.schoolName,
            email: data.adminEmail,
          },
          emailRedirectTo: `${window.location.origin}/login?email_confirmed=true`,
        },
      });

      if (userError || !authData.user) {
        throw new Error(userError?.message || "Failed to create user account");
      }

      console.log("User registered successfully:", authData.user.id);

      // Create school record
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .insert([{
          code: newSchoolCode,
          name: data.schoolName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select("id")
        .single();

      if (schoolError) {
        console.error("School creation error:", schoolError);
        // If school creation fails, we should clean up the user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create school: ${schoolError.message}`);
      }

      if (!schoolData) throw new Error("Failed to create school record");

      console.log("School created successfully:", schoolData.id);

      // Create user profile
      await createUserProfile(
        authData.user.id,
        data.adminEmail,
        "school_admin",
        schoolData.id,
        data.adminFullName
      );

      // Assign school admin role - explicitly cast to AppRole type to ensure type safety
      await assignUserRole(authData.user.id, "school_admin" as AppRole);

      toast.dismiss(loadingToast);
      setRegisteredEmail(data.adminEmail);
      setSchoolCode(newSchoolCode);
      setEmailSent(true);

      toast.success(`School "${data.schoolName}" registration initiated!`, {
        description: `Your school code is ${newSchoolCode}. You MUST verify your email before accessing your dashboard.`,
        duration: 10000,
      });

      toast.info("Please check your email to verify your account.", {
        duration: 15000,
        icon: <Mail className="h-4 w-4" />,
      });

    } catch (error: any) {
      toast.dismiss(loadingToast);
      handleRegistrationError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!registeredEmail) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login?email_confirmed=true`,
        }
      });
      
      if (error) throw error;
      
      toast.success("Verification email sent. Check inbox and spam folder.");
    } catch (error: any) {
      toast.error("Error sending verification email: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="bg-green-100 text-green-800 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-3 gradient-text">Check Your Email</h2>
          <p className="text-gray-600 mb-4">
            We've sent a verification link to your email. Please check inbox and spam.
          </p>
          {schoolCode && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertTitle className="text-amber-800">Save Your School Code</AlertTitle>
              <AlertDescription className="text-amber-700">
                Your school code is <strong>{schoolCode}</strong>. You will need it to add teachers and students.
              </AlertDescription>
            </Alert>
          )}
          <Button variant="outline" className="w-full mb-3" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
          {registeredEmail && (
            <Button 
              variant="secondary" 
              className="w-full" 
              onClick={handleResendVerification} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Didn't get an email? Check your spam folder or request a new one above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6 text-center gradient-text">Register Your School</h2>
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-800" />
          <AlertTitle className="text-blue-800">Email Verification Required</AlertTitle>
          <AlertDescription className="text-blue-700">
            You must verify your email after registration before accessing your dashboard.
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
                    <Input
                      type="text"
                      placeholder="Enter school name"
                      {...field}
                    />
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
                    <Input
                      type="text"
                      placeholder="Enter admin's full name"
                      {...field}
                    />
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
                  <FormLabel>Admin Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                    />
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
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                    />
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
