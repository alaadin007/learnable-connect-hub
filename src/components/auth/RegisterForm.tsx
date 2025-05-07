
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
import { Loader2, AlertCircle, Mail } from "lucide-react";
import {
  checkEmailExists,
  assignUserRole,
  handleRegistrationError,
  registerUser
} from "@/utils/authHelpers";
import { 
  createUserProfile,
  validateUserType 
} from "@/utils/userHelpers";
import { validateSchoolCode } from "@/utils/schoolHelpers";
import { AppRole } from "@/contexts/RBACContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Name must be at least 3 characters." }),
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
  userType: z.enum(["student", "teacher"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const RegisterForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      schoolCode: "",
      userType: "student",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const loadingToast = toast.loading(`Creating your ${values.userType} account...`);

    try {
      const { email, password, schoolCode, userType, fullName } = values;

      // Check if email already exists
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        toast.dismiss(loadingToast);
        toast.error("This email is already registered", {
          description: "Please use a different email address or try logging in.",
          icon: <AlertCircle className="h-5 w-5" />
        });
        setIsLoading(false);
        return;
      }

      // Validate school code
      const { isValid, schoolId } = await validateSchoolCode(schoolCode);
      if (!isValid || !schoolId) {
        toast.dismiss(loadingToast);
        toast.error("Invalid school code", {
          description: "Please check and try again or contact your school administrator.",
          icon: <AlertCircle className="h-5 w-5" />
        });
        setIsLoading(false);
        return;
      }

      // Register user with Supabase auth
      const { data, error } = await registerUser(
        email, 
        password,
        {
          full_name: fullName,
          user_type: validateUserType(userType),
          school_code: schoolCode,
        }
      );

      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user account");

      // Create user profile
      await createUserProfile(
        data.user.id, 
        email, 
        validateUserType(userType), 
        schoolId,
        fullName
      );

      // Assign appropriate role
      await assignUserRole(data.user.id, userType as AppRole);

      toast.dismiss(loadingToast);
      setRegisteredEmail(email);
      setEmailSent(true);
      
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account before logging in.",
        duration: 8000,
      });

    } catch (error: any) {
      toast.dismiss(loadingToast);
      handleRegistrationError(error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleResendVerification = async () => {
    if (!registeredEmail) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login?email_confirmed=true`,
        }
      });
      
      if (error) throw error;
      
      toast.success("Verification email sent. Check your inbox and spam folder.");
    } catch (error: any) {
      toast.error("Error sending verification email: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="w-full max-w-md space-y-4 bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <div className="bg-green-100 text-green-800 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification link to your email. Please check your inbox and spam folders.
          </p>
          <Button variant="outline" className="w-full mb-3" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
          <Button 
            variant="secondary" 
            className="w-full" 
            onClick={handleResendVerification} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend Verification Email"
            )}
          </Button>
        </div>
      </div>
    );
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
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
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
            name="userType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I am a</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
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
