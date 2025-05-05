
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail, AlertCircle, Info } from "lucide-react";
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
  const [existingEmailError, setExistingEmailError] = React.useState<string | null>(null);
  const [existingUserRole, setExistingUserRole] = React.useState<string | null>(null);
  const [registrationError, setRegistrationError] = React.useState<string | null>(null);

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

  // Generate a random uppercase alphanumeric school code without confusing chars
  const generateSchoolCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const checkIfEmailExists = async (email: string): Promise<boolean> => {
    try {
      console.log("Checking if email exists:", email);
      
      // Check the profiles table first (more reliable)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("email", email)
        .limit(1);

      if (profilesError) {
        console.error("Error checking profiles table:", profilesError);
      }

      // If we got data back, the email exists
      const emailExistsInProfiles = profiles && profiles.length > 0;
      console.log("Email exists in profiles:", emailExistsInProfiles);

      if (emailExistsInProfiles && profiles && profiles.length > 0 && profiles[0]?.user_type) {
        setExistingUserRole(profiles[0].user_type);
        console.log("User role from profiles:", profiles[0].user_type);
      }

      // If not found in profiles, try the auth API
      if (!emailExistsInProfiles) {
        // This method checks if an account exists with this email
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
          }
        });

        if (!error || (error && !error.message.includes("Email not found"))) {
          // If there's no error, or the error is not about email not found,
          // the email exists
          console.log("Email exists in auth:", true, data);
          return true;
        }
        
        console.log("Email check from auth:", error?.message, data);
        return false;
      }

      return emailExistsInProfiles;
    } catch (error) {
      console.error("Error during email existence check:", error);
      // Fallback: Assume email does not exist
      return false;
    }
  };

  const onSubmit = async (data: SchoolRegistrationFormValues) => {
    setIsLoading(true);
    setExistingEmailError(null);
    setExistingUserRole(null);
    setRegistrationError(null);

    try {
      const loadingToast = toast.loading("Registering your school...");

      const emailExists = await checkIfEmailExists(data.adminEmail);

      if (emailExists) {
        toast.dismiss(loadingToast);
        setExistingEmailError(data.adminEmail);

        toast.error(
          existingUserRole
            ? `Email already registered as ${existingUserRole}`
            : "Email already registered",
          {
            description:
              "Please use a different email address. Each user can only have one role in the system.",
            duration: 8000,
            icon: <AlertCircle className="h-5 w-5" />,
          }
        );

        setIsLoading(false);
        return;
      }

      const newSchoolCode = generateSchoolCode();
      console.log("Generated school code:", newSchoolCode);

      // Insert into school_codes
      const { error: scError } = await supabase
        .from("school_codes")
        .insert({
          code: newSchoolCode,
          school_name: data.schoolName,
          active: true,
        });

      if (scError) {
        toast.dismiss(loadingToast);
        setRegistrationError("Failed to register school code: " + scError.message);
        toast.error("Failed to register school code");
        setIsLoading(false);
        return;
      }

      // Insert into schools table
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .insert({
          name: data.schoolName,
          code: newSchoolCode,
        })
        .select()
        .single();

      if (schoolError || !schoolData) {
        toast.dismiss(loadingToast);

        try {
          await supabase.from("school_codes").delete().eq("code", newSchoolCode);
          console.log("Cleaned up school_codes after failed school creation");
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
        }

        setRegistrationError("Failed to create school record: " + (schoolError?.message || "No school data returned"));
        toast.error("Failed to create school record");
        setIsLoading(false);
        return;
      }

      console.log("School created with ID:", schoolData.id);

      // Create admin user with metadata
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          data: {
            full_name: data.adminFullName,
            user_type: "school",
            school_code: newSchoolCode,
            school_name: data.schoolName,
            email: data.adminEmail, // Add email to metadata for easier lookups
          },
          emailRedirectTo: window.location.origin + "/login?email_confirmed=true",
        },
      });

      if (userError || !userData || !userData.user) {
        toast.dismiss(loadingToast);

        try {
          await supabase.from("schools").delete().eq("id", schoolData.id);
          await supabase.from("school_codes").delete().eq("code", newSchoolCode);
          console.log("Cleaned up after failed user creation");
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
        }

        if (userError?.message.includes("already registered")) {
          setExistingEmailError(data.adminEmail);
          toast.error(
            "Email already registered",
            {
              description:
                "This email is already registered. Please use a different email or log in instead.",
              duration: 8000,
              icon: <AlertCircle className="h-4 w-4" />,
            }
          );
        } else {
          setRegistrationError("Failed to create admin user account: " + (userError?.message || "No user data returned"));
          toast.error("Failed to create admin user account");
        }
        setIsLoading(false);
        return;
      }

      console.log("Admin user created with ID:", userData.user.id);

      // Create admin profile manually (in case the trigger doesn't work)
      try {
        await supabase.from("profiles").insert({
          id: userData.user.id,
          user_type: "school",
          full_name: data.adminFullName,
          school_code: newSchoolCode,
          school_name: data.schoolName,
          email: data.adminEmail,
        });
        console.log("Created profile record");
      } catch (profileError) {
        console.log("Note: Profile creation error (may be auto-created by trigger):", profileError);
      }

      // Create teacher record with supervisor rights
      try {
        await supabase.from("teachers").insert({
          id: userData.user.id,
          school_id: schoolData.id,
          is_supervisor: true,
        });
        console.log("Created teacher supervisor record");
      } catch (teacherErr) {
        toast.dismiss(loadingToast);
        setRegistrationError("Failed to create teacher record: " + String(teacherErr));
        toast.error("Failed to create teacher admin record");
        setIsLoading(false);
        return;
      }

      toast.dismiss(loadingToast);

      setRegisteredEmail(data.adminEmail);
      setSchoolCode(newSchoolCode);
      setEmailSent(true);

      toast.success(`School "${data.schoolName}" successfully registered!`, {
        description: `Your school code is ${newSchoolCode}. Check your email to verify your account.`,
        duration: 10000,
      });

      toast.info("Please verify your email before accessing your dashboard.", {
        duration: 15000,
        icon: <Mail className="h-4 w-4" />,
      });
    } catch (err: any) {
      toast.error(`Unexpected error: ${err.message || err}`);
      setRegistrationError(err.message || "Unknown error during registration");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend verification email
  const handleResetPassword = async () => {
    if (!registeredEmail) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(registeredEmail, {
        redirectTo: window.location.origin + "/login?email_confirmed=true",
      });
      if (error) toast.error("Failed to send verification email: " + error.message);
      else toast.success("Verification email sent. Check inbox and spam folder.");
    } catch (error: any) {
      toast.error("Error sending verification email: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent)
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
            <Button variant="secondary" className="w-full" onClick={handleResetPassword} disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Resend Verification Email"}
            </Button>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Didn't get an email? Check your spam folder or request a new one above.
          </p>
        </div>
      </div>
    );

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6 text-center gradient-text">Register Your School</h2>
        {existingEmailError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {existingUserRole
                ? `Email Already Registered as ${existingUserRole}`
                : "Email Already Registered"}
            </AlertTitle>
            <AlertDescription>
              The email "{existingEmailError}" is already registered
              {existingUserRole ? ` as a ${existingUserRole} account.` : "."} Please use a different email or{" "}
              <a href="/login" className="font-medium underline">log in</a>.
            </AlertDescription>
          </Alert>
        )}
        {registrationError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Error</AlertTitle>
            <AlertDescription>{registrationError}</AlertDescription>
          </Alert>
        )}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-800" />
          <AlertTitle className="text-blue-800">Email Verification Required</AlertTitle>
          <AlertDescription className="text-blue-700">
            You must verify your email after registration before accessing your dashboard.
          </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {["schoolName", "adminFullName", "adminEmail", "adminPassword", "confirmPassword"].map((fieldName) => (
              <FormField
                key={fieldName}
                control={form.control}
                name={fieldName as keyof SchoolRegistrationFormValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {fieldName === "schoolName" && "School Name"}
                      {fieldName === "adminFullName" && "Admin Full Name"}
                      {fieldName === "adminEmail" && "Admin Email"}
                      {fieldName === "adminPassword" && "Admin Password"}
                      {fieldName === "confirmPassword" && "Confirm Password"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type={
                          fieldName === "adminEmail"
                            ? "email"
                            : fieldName.toLowerCase().includes("password")
                            ? "password"
                            : "text"
                        }
                        placeholder={
                          fieldName === "schoolName"
                            ? "Enter school name"
                            : fieldName === "adminFullName"
                            ? "Enter admin's full name"
                            : fieldName === "adminEmail"
                            ? "admin@school.edu"
                            : "••••••••"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
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
