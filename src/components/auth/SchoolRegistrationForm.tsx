
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  schoolName: z.string().min(2, { message: "School name must be at least 2 characters" }),
  adminEmail: z.string().email({ message: "Invalid email address" }),
  adminFullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
  contactEmail: z.string().email({ message: "Invalid contact email" }).optional(),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

const SchoolRegistrationForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: "",
      adminEmail: "",
      adminFullName: "",
      password: "",
      confirmPassword: "",
      contactEmail: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // First register the school
      const { data: schoolData, error: schoolError } = await supabase.functions.invoke('register-school', {
        body: { 
          schoolName: data.schoolName,
          adminEmail: data.adminEmail,
          adminFullName: data.adminFullName,
          contactEmail: data.contactEmail || data.adminEmail
        }
      });

      if (schoolError) {
        console.error("School registration error:", schoolError);
        throw new Error(schoolError.message || "Failed to register school");
      }

      if (!schoolData || !schoolData.school_id || !schoolData.school_code) {
        throw new Error("Invalid response from school registration");
      }

      console.log("School registration successful:", schoolData);

      // Now sign up the admin user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.adminFullName,
            school_code: schoolData.school_code,
            user_type: 'school_admin'
          }
        }
      });

      if (authError) {
        console.error("Admin registration error:", authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Admin registration failed");
      }

      console.log("Admin registration successful:", authData);
      
      // Show success message with school code
      toast.success(
        <div>
          <h3>School Registration Successful!</h3>
          <p>Your school code is: <strong>{schoolData.school_code}</strong></p>
          <p>Please check your email to verify your account.</p>
        </div>,
        { duration: 10000 }
      );
      
      // Redirect to login page
      setTimeout(() => navigate("/login"), 3000);
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">School Details</h2>
        
        <FormField
          control={form.control}
          name="schoolName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School Name</FormLabel>
              <FormControl>
                <Input placeholder="Example High School" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School Contact Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@school.edu" {...field} />
              </FormControl>
              <FormDescription>
                If left empty, administrator email will be used
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <h2 className="text-xl font-semibold mb-4 mt-8">Administrator Account</h2>
        
        <FormField
          control={form.control}
          name="adminEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Administrator Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="admin@example.com" {...field} />
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
              <FormLabel>Administrator Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="******" {...field} />
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
                <Input type="password" placeholder="******" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full gradient-bg mt-6" 
          disabled={isLoading}
        >
          {isLoading ? "Registering..." : "Register School"}
        </Button>
      </form>
    </Form>
  );
};

export default SchoolRegistrationForm;
