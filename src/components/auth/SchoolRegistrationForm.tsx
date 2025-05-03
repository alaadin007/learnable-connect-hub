
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
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const onSubmit = async (values: SchoolFormValues) => {
    setIsLoading(true);
    setServerError(null);
    
    try {
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
        throw new Error(error.message || "Failed to register school");
      }

      if (!data.success) {
        console.error("Registration unsuccessful:", data);
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
      
      setServerError(error.message || "An unexpected error occurred during registration");
      
      // Handle specific error cases
      if (error.message?.includes("already registered")) {
        toast.error("Email already registered", {
          description: "This email address is already in use. Please try logging in or use a different email address."
        });
      } else {
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
