
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const schoolFormSchema = z
  .object({
    schoolName: z.string().min(2, {
      message: "School name must be at least 2 characters.",
    }),
    adminFullName: z.string().min(2, {
      message: "Full name must be at least 2 characters.",
    }),
    adminEmail: z.string().email({
      message: "Please enter a valid email address.",
    }),
    adminPassword: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
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

  // Email existence check before form submission
  const checkEmailExists = async (email: string) => {
    try {
      // Try to sign in with a dummy password to check if the email exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: "dummy-password-for-check-only",
      });

      // If there's no error about invalid credentials, email might exist
      const emailExists = !error || !error.message?.includes("Invalid login credentials");
      
      if (emailExists) {
        // Check for existing role
        const { data, error: roleError } = await supabase
          .from('profiles')
          .select('user_type')
          .ilike('id', `%${email}%`)
          .limit(1);
        
        if (!roleError && data && data.length > 0 && data[0].user_type) {
          const role = data[0].user_type;
          let formattedRole = role;
          
          switch (role) {
            case 'school':
              formattedRole = 'School Administrator';
              break;
            case 'teacher':
              formattedRole = 'Teacher';
              break;
            case 'student':
              formattedRole = 'Student';
              break;
            default:
              formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
          }
          
          setExistingRole(formattedRole);
        }
        
        setEmailError(email);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking email existence:", error);
      // In case of error, safer to assume email might exist
      return false;
    }
  };

  const onSubmit = async (values: SchoolFormValues) => {
    clearErrors();
    setIsLoading(true);
    
    try {
      // First check if email already exists
      const emailExists = await checkEmailExists(values.adminEmail);
      
      if (emailExists) {
        const roleMessage = existingRole 
          ? `This email is already registered as a ${existingRole}`
          : "This email is already registered";
          
        toast.error(roleMessage, {
          description: "Please use a different email address. Each user can only have one role in the system."
        });
        setIsLoading(false);
        return;
      }
      
      // Call the Supabase Edge Function for registration
      const { data, error } = await supabase.functions.invoke('register-school', {
        body: {
          schoolName: values.schoolName,
          adminEmail: values.adminEmail,
          adminPassword: values.adminPassword,
          adminFullName: values.adminFullName,
        },
      });

      if (error) {
        console.error("School registration error:", error);
        if (error.message.includes("service") || error.message.includes("unavailable")) {
          setServerError("Registration service is temporarily unavailable. Please try again later.");
        } else {
          setServerError(error.message);
        }
        toast.error("Registration failed", {
          description: error.message
        });
        return;
      }

      if (data?.error) {
        console.error("School registration api error:", data.error);
        
        if (data.error.includes("already registered")) {
          setEmailError(values.adminEmail);
          toast.error("Email already registered", {
            description: "Please use a different email address or login if this is your account."
          });
          return;
        }
        
        setServerError(data.error);
        toast.error("Registration failed", {
          description: data.error
        });
        return;
      }

      // Handle success
      toast.success("School registration successful!", {
        description: "Please check your email to verify your account.",
      });
      navigate("/login?registered=true");
      
    } catch (error: any) {
      console.error("Registration error:", error);
      setServerError(error.message || "An unexpected error occurred");
      toast.error("Registration failed", {
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              {existingRole
                ? `Email Already Registered as ${existingRole}`
                : "Email Already Registered"}
            </AlertTitle>
            <AlertDescription>
              The email address "{emailError}" is already registered
              {existingRole ? ` as a ${existingRole} account` : ""}. Please use a
              different email or{" "}
              <Link to="/login" className="font-medium underline">
                login
              </Link>{" "}
              if this is your account. Each user can only have one role.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Form fields */}
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
