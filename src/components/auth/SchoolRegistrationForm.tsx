
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";

const schoolFormSchema = z.object({
  schoolName: z.string().min(2, {
    message: "School name must be at least 2 characters.",
  }),
  adminEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  adminPassword: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  adminFullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SchoolFormValues = z.infer<typeof schoolFormSchema>;

const SchoolRegistrationForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [existingRole, setExistingRole] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      schoolName: "",
      adminEmail: "",
      adminPassword: "",
      adminFullName: "",
      confirmPassword: "",
    },
  });

  const clearErrors = () => {
    setServerError(null);
    setEmailError(null);
    setExistingRole(null);
    setServiceUnavailable(false);
  };

  const checkIfEmailExists = async (email: string): Promise<boolean> => {
    try {
      // First, check if the email is already registered using a query to auth.users
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: "dummy-password-for-check-only",
      });

      // If there's no error or the error is not about invalid credentials, email might exist
      const emailExists = !signInError || (signInError && !signInError.message.includes("Invalid login credentials"));
      
      if (emailExists) {
        try {
          // Try to get the user's role from the profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('user_type')
            .ilike('id', `%${email}%`) // This is a workaround since we can't directly query by email
            .limit(1);
          
          if (error) {
            console.error("Error checking user role:", error);
          } else if (data && data.length > 0 && data[0].user_type) {
            // Set the existing role with proper capitalization for display
            const role = data[0].user_type;
            switch (role) {
              case 'school':
                setExistingRole('School Administrator');
                break;
              case 'teacher':
                setExistingRole('Teacher');
                break;
              case 'student':
                setExistingRole('Student');
                break;
              default:
                setExistingRole(role.charAt(0).toUpperCase() + role.slice(1));
            }
          }
        } catch (roleError) {
          console.error("Error checking email role:", roleError);
        }
      }

      return emailExists;
    } catch (error) {
      console.error("Error checking email existence:", error);
      // In case of error, safer to assume it might exist
      return true;
    }
  };

  const onSubmit = async (values: SchoolFormValues) => {
    clearErrors();
    setIsLoading(true);
    
    try {
      // First check if the email already exists
      const emailExists = await checkIfEmailExists(values.adminEmail);
      
      if (emailExists) {
        setEmailError(values.adminEmail);
        
        const roleMessage = existingRole 
          ? `This email is already registered as a ${existingRole}`
          : "This email is already registered";
          
        toast.error(roleMessage, {
          description: "Please use a different email address. Each user can only have one role in the system."
        });
        
        setIsLoading(false);
        return;
      }
      
      console.log("Registering school:", values.schoolName, "with admin:", values.adminEmail);
      
      // Call the register-school edge function
      const { data, error } = await supabase.functions.invoke("register-school", {
        body: {
          schoolName: values.schoolName,
          adminEmail: values.adminEmail,
          adminPassword: values.adminPassword,
          adminFullName: values.adminFullName
        }
      });

      if (error) {
        console.error("School registration error:", error);
        
        // Check if it's a 409 Conflict error (already registered email)
        if (error.message?.includes("409") || error.message?.includes("conflict")) {
          setEmailError(values.adminEmail);
          toast.error("Email already registered", {
            description: "This email address is already registered. Please use a different email address or try logging in."
          });
          setIsLoading(false);
          return;
        }
        
        // Check if it's a service unavailable error
        if (error.message?.includes("500") || error.message?.includes("503")) {
          setServiceUnavailable(true);
          toast.error("Registration service unavailable", {
            description: "The registration service is currently unavailable. Please try again later."
          });
          setIsLoading(false);
          return;
        }
        
        throw new Error(error.message || "Failed to register school");
      }

      if (!data.success) {
        console.error("Registration unsuccessful:", data);
        
        // Special handling for already registered email
        if (data.error?.includes("already registered")) {
          setEmailError(values.adminEmail);
          toast.error("Email already registered", {
            description: data.message || "This email is already registered. Please use a different email address."
          });
          setIsLoading(false);
          return;
        }
        
        throw new Error(data.error || "Registration failed");
      }

      console.log("School registration successful:", data);

      toast.success("School registration successful!", {
        description: data.message || "Please check your email to verify your account before logging in.",
      });

      // Redirect to login page with email confirmation pending message
      navigate("/login?registered=true");
    } catch (error: any) {
      console.error("Error during school registration:", error);
      
      // Special handling for already registered email error
      if (error.message?.includes("already registered") || error.message?.includes("Email already registered")) {
        setEmailError(values.adminEmail);
        toast.error("Email already registered", {
          description: "This email address is already registered. Please use a different email address or try logging in."
        });
      } else if (error.message?.includes("non-2xx") || error.message?.includes("Edge Function")) {
        // Handle edge function errors
        setServiceUnavailable(true);
        toast.error("Registration service unavailable", {
          description: "Please try again later or contact support if the issue persists."
        });
      } else {
        setServerError(error.message || "An unexpected error occurred during registration");
        toast.error("Registration failed", {
          description: error.message || "Please try again or contact support if the issue persists."
        });
      }
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
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        
        {serviceUnavailable && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Service Unavailable</AlertTitle>
            <AlertDescription>
              The registration service is currently unavailable. Please try again later or 
              contact support if the issue persists.
            </AlertDescription>
          </Alert>
        )}
        
        {emailError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {existingRole 
                ? `Email Already Registered as ${existingRole}` 
                : 'Email Already Registered'}
            </AlertTitle>
            <AlertDescription>
              The email address "{emailError}" is already registered
              {existingRole ? ` as a ${existingRole} account` : ''}.
              Please use a different email or <Link to="/login" className="font-medium underline">login</Link> if this is your account.
              Each user can only have one role in the system.
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
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
              </div>
              
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
                    <FormDescription>
                      At least 8 characters
                    </FormDescription>
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
            </div>
            
            <Button 
              type="submit" 
              className="w-full gradient-bg" 
              disabled={isLoading || serviceUnavailable}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : serviceUnavailable ? (
                "Service Unavailable"
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
