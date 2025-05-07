
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  checkEmailExists,
  validateSchoolCode,
  createUserProfile,
  assignUserRole,
  handleRegistrationError
} from "@/utils/authHelpers";
import { AppRole } from "@/contexts/RBACContext";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).*$/,
      "Password must contain at least one letter and one number"
    ),
  confirmPassword: z.string(),
  schoolCode: z.string().min(5, { message: "School code must be at least 5 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const RegisterForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      schoolCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { email, password, schoolCode } = values;

      // Check if email already exists
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        toast.error("This email is already registered. Please use a different email address.");
        return;
      }

      // Validate school code
      const { isValid, schoolId } = await validateSchoolCode(schoolCode);
      if (!isValid) {
        toast.error("Invalid school code. Please check and try again.");
        return;
      }

      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            school_code: schoolCode,
            user_type: 'student',
          },
          emailRedirectTo: `${window.location.origin}/login?email_confirmed=true`,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user account");

      // Create user profile
      await createUserProfile(data.user.id, email, 'student', schoolId as string);

      // Assign student role
      await assignUserRole(data.user.id, 'student' as AppRole);

      toast.success("Registration successful! Please check your email to verify your account.");
      navigate("/login", { 
        state: { 
          message: "Registration successful! Please verify your email before logging in." 
        } 
      });
    } catch (error: any) {
      handleRegistrationError(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <h2 className="text-2xl font-bold">Create an account</h2>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-primary underline">
          Log in
        </Link>
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Email" {...field} type="email" />
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
                  <Input placeholder="Password" {...field} type="password" />
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
                    placeholder="Confirm Password"
                    {...field}
                    type="password"
                  />
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
                  <Input
                    placeholder="Enter your school code"
                    {...field}
                    type="text"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Register"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default RegisterForm;
