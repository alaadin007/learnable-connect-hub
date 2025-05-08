import React, { useState } from 'react';
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from '@/integrations/supabase/client';

const FormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  confirmPassword: z.string(),
  userType: z.enum(["school_admin", "teacher", "student"]).optional(),
  schoolCode: z.string().optional(),
  terms: z.boolean().refine((value) => value === true, {
    message: 'You must accept the terms and conditions.',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
})

type FormData = z.infer<typeof FormSchema>;

interface SchoolCodeData {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export function RegisterForm() {
  const [registrationType, setRegistrationType] = useState<"school" | "teacher" | "student">("school");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolCodeValid, setSchoolCodeValid] = useState(false);
  const [schoolData, setSchoolData] = useState<SchoolCodeData | null>(null);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  })

  const handleSchoolCodeVerification = async (code: string) => {
    try {
      const { data, error } = await supabase.rpc('get_school_by_code', {
        input_code: code,
      });

      if (error) {
        console.error("Error verifying school code:", error);
        toast.error("Failed to verify school code.");
        setSchoolCodeValid(false);
        setSchoolData(null);
        return;
      }

      if (data && data.length > 0) {
        setSchoolCodeValid(true);
        setSchoolData(data[0] as SchoolCodeData);
        toast.success(`School code verified: ${data[0].name}`);
      } else {
        setSchoolCodeValid(false);
        setSchoolData(null);
        toast.error("Invalid school code.");
      }
    } catch (error) {
      console.error("Error verifying school code:", error);
      toast.error("An error occurred while verifying the school code.");
      setSchoolCodeValid(false);
      setSchoolData(null);
    }
  };

  const handleSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    
    try {
      // Extract data
      const { fullName, email, password, schoolCode } = data;

      // For school registration
      if (registrationType === "school") {
        // Basic validation
        if (!fullName || !email || !password) {
          toast.error("Please fill in all required fields.");
          setIsSubmitting(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await signUp(
          email, 
          password, 
          { 
            user_type: "school_admin", 
            full_name: fullName,
            school_code: schoolData?.code
          }
        );

        if (signUpError) {
          console.error("Error signing up:", signUpError);
          toast.error(signUpError.message || "Failed to sign up. Please try again.");
          setIsSubmitting(false);
          return;
        }

        toast.success("School account created successfully! Please check your email to verify your account.");
        navigate('/login');
      } 
      // For student registration
      else if (registrationType === "student") {
        if (!schoolCode) {
          toast.error("Please enter your school code.");
          setIsSubmitting(false);
          return;
        }

        const { error: signUpError } = await signUp(
          email, 
          password, 
          { 
            user_type: "student", 
            full_name: fullName,
            school_code: schoolCode
          }
        );

        if (signUpError) {
          console.error("Error signing up:", signUpError);
          toast.error(signUpError.message || "Failed to sign up. Please try again.");
          setIsSubmitting(false);
          return;
        }

        toast.success("Student account created successfully! Please check your email to verify your account.");
        navigate('/login');
      }
      // For teacher registration
      else if (registrationType === "teacher") {
        if (!schoolCode) {
          toast.error("Please enter your school code.");
          setIsSubmitting(false);
          return;
        }

        const { error: signUpError } = await signUp(
          email, 
          password, 
          { 
            user_type: "teacher", 
            full_name: fullName,
            school_code: schoolCode
          }
        );

        if (signUpError) {
          console.error("Error signing up:", signUpError);
          toast.error(signUpError.message || "Failed to sign up. Please try again.");
          setIsSubmitting(false);
          return;
        }

        toast.success("Teacher account created successfully! Please check your email to verify your account.");
        navigate('/login');
      }
      
    } catch (error: any) {
      console.error("Error during registration:", error);
      toast.error(error.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Choose your registration type</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Select value={registrationType} onValueChange={setRegistrationType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select registration type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="school">Register School</SelectItem>
              <SelectItem value="teacher">Register as Teacher</SelectItem>
              <SelectItem value="student">Register as Student</SelectItem>
            </SelectContent>
          </Select>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                      <Input placeholder="Enter your email" {...field} />
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
                      <Input type="password" placeholder="Enter your password" {...field} />
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
                      <Input type="password" placeholder="Confirm your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {registrationType !== "school" && (
                <div className="space-y-2">
                  <FormLabel>School Code</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="schoolCode"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input 
                              placeholder="Enter school code" 
                              {...field} 
                              onBlur={(e) => handleSchoolCodeVerification(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {schoolCodeValid && schoolData && (
                    <p className="text-sm text-green-500">
                      School Name: {schoolData.name}
                    </p>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Accept Terms and Conditions
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center">
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
            Already have an account? Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
