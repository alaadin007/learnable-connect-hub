
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
import { supabaseHelpers } from "@/utils/supabaseHelpers";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
  schoolCode: z.string().min(5, { message: "School code must be at least 5 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
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

      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            school_code: schoolCode,
          },
          emailRedirectTo: window.location.origin + "/login?email_confirmed=true",
        },
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        toast.error("Failed to create user. Please try again.");
        setIsLoading(false);
        return;
      }

      // Create a user profile
      const profileData = supabaseHelpers.prepareTableInsert({
        id: data.user.id,
        email: email,
        school_code: schoolCode,
        user_type: 'student'
      });

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert([profileData]);

      if (profileError) {
        toast.error(
          `User created, but profile creation failed: ${profileError.message}`
        );
        setIsLoading(false);
        return;
      }

      // Check if the school exists
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("id")
        .eq("code", supabaseHelpers.asSupabaseParam(schoolCode))
        .single();

      if (schoolError) {
        // Create a new school if it doesn't exist
        const newSchool = supabaseHelpers.prepareTableInsert({
          code: schoolCode,
          name: "Your School Name", // You might want to prompt the user for the school name
        });

        const { data: newSchoolData, error: newSchoolError } = await supabase
          .from("schools")
          .insert([newSchool])
          .select("id")
          .single();

        if (newSchoolError || !newSchoolData) {
          toast.error(
            "Registration successful, but failed to create school. Please contact support."
          );
          setIsLoading(false);
          return;
        }

        // Update the user's profile with the school ID
        const { error: updateError } = await supabase
          .from("profiles")
          .update(supabaseHelpers.prepareSupabaseUpdate({ school_id: (newSchoolData as any).id }))
          .eq("id", supabaseHelpers.asSupabaseParam(data.user.id));

        if (updateError) {
          toast.error(
            "Registration successful, but failed to update profile with school ID. Please contact support."
          );
          setIsLoading(false);
          return;
        }
      } else if (schoolData) {
        // Update the user's profile with the school ID
        const { error: updateError } = await supabase
          .from("profiles")
          .update(supabaseHelpers.prepareSupabaseUpdate({ school_id: (schoolData as any).id }))
          .eq("id", supabaseHelpers.asSupabaseParam(data.user.id));

        if (updateError) {
          toast.error(
            "Registration successful, but failed to update profile with school ID. Please contact support."
          );
          setIsLoading(false);
          return;
        }
      }

      toast.success("Registration successful! Please check your email to verify your account.");
      navigate("/login");
    } catch (error: any) {
      toast.error(`An error occurred: ${error.message}`);
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
                  <Input placeholder="School Code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default RegisterForm;
