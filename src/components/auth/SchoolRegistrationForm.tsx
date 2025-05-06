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

const labels: Record<keyof SchoolRegistrationFormValues, string> = {
  schoolName: "School Name",
  adminFullName: "Admin Full Name",
  adminEmail: "Admin Email",
  adminPassword: "Admin Password",
  confirmPassword: "Confirm Password",
};

const inputTypes: Record<keyof SchoolRegistrationFormValues, string> = {
  schoolName: "text",
  adminFullName: "text",
  adminEmail: "email",
  adminPassword: "password",
  confirmPassword: "password",
};

const SchoolRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [schoolCode, setSchoolCode] = React.useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);
  const [existingEmailError, setExistingEmailError] = React.useState<string | null>(null);
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

  // Generate random uppercase alphanumeric school code (exclude confusing chars)
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
      const { data, error } = await supabase
        .rpc("check_if_email_exists", { input_email: email })
        .single();

      if (error) {
        console.error("Error checking if email exists:", error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Error during email existence check:", error);
      return false;
    }
  };

  const onSubmit = async (data: SchoolRegistrationFormValues) => {
    setIsLoading(true);
    setExistingEmailError(null);
    setRegistrationError(null);

    try {
      const loadingToast = toast.loading("Registering your school...");

      const emailExists = await checkIfEmailExists(data.adminEmail);

      if (emailExists) {
        toast.dismiss(loadingToast);
        setExistingEmailError(data.adminEmail);

        toast.error("Email already registered", {
          description:
            "Please use a different email address. Each user can only have one role in the system.",
          duration: 8000,
          icon: <AlertCircle className="h-5 w-5" />,
        });

        setIsLoading(false);
        return;
      }

      const newSchoolCode = generateSchoolCode();

      // Register user with Supabase auth
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          data: {
            full_name: data.adminFullName,
            user_type: "school",
            school_code: newSchoolCode,
            school_name: data.schoolName,
            email: data.adminEmail,
          },
          emailRedirectTo: window.location.origin + "/login?email_confirmed=true",
        },
      });

      if (userError || !userData || !userData.user) {
        toast.dismiss(loadingToast);
        setRegistrationError(
          "Failed to create school account: " + (userError?.message || "Unknown error")
        );
        toast.error("Failed to create school account");
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
      toast.error(`Registration error: ${err.message || err}`);
      setRegistrationError(err.message || "Unknown error during registration");
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6 text-center gradient-text">Register Your School</h2>
        {existingEmailError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Email Already Registered</AlertTitle>
            <AlertDescription>
              The email "{existingEmailError}" is already registered. Please use a different email or{" "}
              <a href="/login" className="font-medium underline">
                log in
              </a>
              .
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
            {(Object.keys(labels) as (keyof SchoolRegistrationFormValues)[]).map((fieldName) => (
              <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{labels[fieldName]}</FormLabel>
                    <FormControl>
                      <Input
                        type={inputTypes[fieldName]}
                        placeholder={
                          fieldName === "adminEmail"
                            ? "admin@school.edu"
                            : fieldName.toLowerCase().includes("password")
                            ? "••••••••"
                            : fieldName === "schoolName"
                            ? "Enter school name"
                            : fieldName === "adminFullName"
                            ? "Enter admin's full name"
                            : undefined
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