
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  schoolCode: z.string().min(1, { message: "School code is required" }),
  userType: z.enum(["student", "teacher"], { 
    required_error: "Please select your role" 
  }),
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
      userType: "student",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // First verify if the school code is valid using our new function
      const { data: schoolInfo, error: validationError } = await supabase
        .rpc('verify_and_link_school_code', { code: data.schoolCode });
      
      if (validationError) {
        console.error("Error verifying school code:", validationError);
        throw new Error(validationError.message || "Invalid school code. Please check and try again.");
      }

      // schoolInfo is an array, so we need to get the first element
      if (!schoolInfo || !schoolInfo[0] || !schoolInfo[0].valid) {
        throw new Error("Invalid school code. Please check and try again.");
      }

      // Extract the school details from the validation result (from first element of array)
      const schoolId = schoolInfo[0].school_id;
      const schoolName = schoolInfo[0].school_name;
      
      if (!schoolId) {
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
            school_name: schoolName || "Unknown School",
            user_type: data.userType, // Use selected user type
            school_id: schoolId // Use the school_id from our validation function
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
      
      // Call our edge function to set up the user in the correct tables
      const { error: setupError } = await supabase.functions.invoke("verify-and-setup-user");
      if (setupError) {
        console.warn("User profile setup warning:", setupError);
        // Continue despite this error - it's not critical for the registration
      }
      
      // Show success message
      toast.success(
        <div>
          <h3>Registration Successful!</h3>
          <p>Please check your email to verify your account.</p>
          {data.userType === "student" && (
            <div className="mt-2">
              <Badge variant="success">Student Account</Badge>
              <p className="text-sm mt-1">Your account needs teacher approval before you can log in.</p>
            </div>
          )}
          {data.userType === "teacher" && (
            <div className="mt-2">
              <Badge variant="success">Teacher Account</Badge>
              <p className="text-sm mt-1">You can log in after verifying your email.</p>
            </div>
          )}
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
          name="userType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>I am a</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-6"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="student" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Student</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="teacher" />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Teacher</FormLabel>
                  </FormItem>
                </RadioGroup>
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
