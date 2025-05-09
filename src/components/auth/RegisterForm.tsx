
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSchoolCode } from "@/hooks/use-school-code";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  fullName: z.string().min(2, { message: "Full name is required" }),
  schoolCode: z.string().min(4, { message: "School code is required" })
});

type RegisterFormValues = z.infer<typeof formSchema>;

const RegisterForm = () => {
  const [loading, setLoading] = useState(false);
  const { verifySchoolCode, getSchoolName } = useSchoolCode();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      schoolCode: ""
    }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setLoading(true);
      
      // Verify school code
      const isValid = await verifySchoolCode(data.schoolCode);
      
      if (!isValid) {
        toast.error("Invalid school code. Please check and try again.");
        return;
      }

      const schoolName = await getSchoolName(data.schoolCode);
      
      // Register user
      const { error } = await signUp(
        data.email,
        data.password,
        {
          user_type: "student",
          full_name: data.fullName,
          school_code: data.schoolCode,
          school_name: schoolName
        }
      );

      if (error) {
        console.error("Registration error:", error);
        toast.error(error.message || "Failed to register. Please try again.");
        return;
      }

      // Success!
      toast.success("Registration successful! Please log in.");
      navigate("/login");
      
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Create Your Account</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your email" 
                    type="email" 
                    {...field} 
                    disabled={loading}
                  />
                </FormControl>
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
                  <Input 
                    placeholder="Create a secure password" 
                    type="password" 
                    {...field} 
                    disabled={loading}
                  />
                </FormControl>
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
                  <Input 
                    placeholder="Enter your full name" 
                    {...field} 
                    disabled={loading}
                  />
                </FormControl>
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
                    placeholder="Enter your school's code" 
                    {...field} 
                    disabled={loading}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full mt-6" 
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </Button>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default RegisterForm;
