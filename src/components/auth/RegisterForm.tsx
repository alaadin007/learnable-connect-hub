
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  schoolCode: z.string().min(1, { message: "School code is required" }),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

const RegisterForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      schoolCode: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // First verify if the school code is valid
      const { data: isValidSchoolCode, error: schoolCodeError } = await supabase
        .rpc('verify_school_code', { code: data.schoolCode });
      
      if (schoolCodeError) {
        console.error("Error verifying school code:", schoolCodeError);
        throw new Error(schoolCodeError.message || "Invalid school code. Please check and try again.");
      }

      if (!isValidSchoolCode) {
        throw new Error("Invalid school code. Please check and try again.");
      }

      // Get the school information from the school code
      const { data: schoolInfo, error: schoolInfoError } = await supabase
        .from("school_codes")
        .select("id, school_name")
        .eq("code", data.schoolCode)
        .eq("active", true)
        .single();
      
      if (schoolInfoError || !schoolInfo) {
        console.error("Error getting school info:", schoolInfoError);
        throw new Error("Could not find school information. Please check your school code.");
      }
      
      // Register user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            school_code: data.schoolCode,
            school_name: schoolInfo?.school_name || "Unknown School",
            user_type: 'student', // Default to student role
            school_id: schoolInfo?.id // Include the school_id from school_codes table
          }
        }
      });

      if (authError) {
        console.error("Registration error:", authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Registration failed. Please try again.");
      }
      
      console.log("Registration successful:", authData);
      
      // Show success message
      toast.success(
        <div>
          <h3>Registration Successful!</h3>
          <p>Please check your email to verify your account.</p>
        </div>, 
        { duration: 6000 }
      );
      
      // Redirect to login page
      setTimeout(() => navigate("/login"), 1000);
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="schoolCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>School Code</FormLabel>
              <FormControl>
                <Input placeholder="Enter your school code" {...field} />
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
          className="w-full gradient-bg" 
          disabled={isLoading}
        >
          {isLoading ? "Registering..." : "Register"}
        </Button>
        
        <p className="text-center text-sm">
          Already have an account?{" "}
          <Button
            variant="link"
            className="p-0 h-auto text-primary"
            onClick={() => navigate("/login")}
          >
            Login
          </Button>
        </p>
      </form>
    </Form>
  );
};

export default RegisterForm;
