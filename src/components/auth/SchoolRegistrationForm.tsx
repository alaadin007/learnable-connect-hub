
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
import { AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { insertSchool, insertSchoolCode } from "@/utils/supabaseTypeHelpers";

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

// Function to generate a random school code
const generateSchoolCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
  let result = 'SCH';
  
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

const SchoolRegistrationForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setErrorMessage(null);
    
    try {
      // Check if email is already registered by trying to get user by email
      const { data: existingUser, error: emailCheckError } = await supabase.auth.signInWithPassword({
        email: data.adminEmail,
        password: "temp-check-only-not-real-password"
      });
      
      // If sign-in didn't return auth error about invalid user, it means the user exists
      if (existingUser?.user) {
        throw new Error("Email already registered");
      }
      
      // Generate unique school code
      const schoolCode = generateSchoolCode();
      
      // Create school record using the typed helper
      const { data: schoolsData, error: schoolError } = await insertSchool({
        name: data.schoolName,
        code: schoolCode,
        contact_email: data.contactEmail || data.adminEmail,
      });

      if (schoolError || !schoolsData || schoolsData.length === 0) {
        console.error("Error creating school:", schoolError);
        throw new Error("Failed to create school record");
      }
      
      const school = schoolsData[0];
      if (!school) {
        throw new Error("Failed to create school record");
      }

      // Create school code record with reference to the school
      const { error: schoolCodeError } = await insertSchoolCode({
        code: schoolCode,
        school_name: data.schoolName,
        active: true,
        school_id: school.id
      });
      
      if (schoolCodeError) {
        console.error("Error creating school code:", schoolCodeError);
        
        // Clean up the school record if code creation fails
        await supabase
          .from("schools")
          .delete()
          .eq("id", school.id);
          
        throw new Error("Failed to create school code");
      }

      // Create the admin user
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.adminFullName,
            school_code: schoolCode,
            user_type: 'school_admin',
            school_id: school.id,
            school_name: data.schoolName
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (userError) {
        console.error("Error creating admin user:", userError);
        
        // Clean up the school and school code records if user creation fails
        await supabase
          .from("school_codes")
          .delete()
          .eq("code", schoolCode);
          
        await supabase
          .from("schools")
          .delete()
          .eq("id", school.id);
          
        throw new Error(userError.message || "Failed to create admin user");
      }

      // Call our edge function to set up the user
      if (userData.user) {
        const { error: setupError } = await supabase.functions.invoke("verify-and-setup-user");
        if (setupError) {
          console.warn("Admin setup warning:", setupError);
          // Continue despite this warning
        }
      }

      console.log("Successfully registered school and admin:", {
        school_id: school.id,
        school_code: schoolCode,
        school_name: data.schoolName,
        admin_id: userData.user?.id
      });

      // Show success message with school code
      toast.success(
        <div>
          <h3>School Registration Successful!</h3>
          <p>Your school code is: <strong>{schoolCode}</strong></p>
          <p>Use this code to invite teachers and students to your school.</p>
          <p>Please check your email to verify your account.</p>
        </div>,
        { duration: 10000 }
      );
      
      // Redirect to login page after successful registration
      setTimeout(() => navigate("/login"), 3000);
      
    } catch (error: any) {
      console.error("Registration error:", error);
      setErrorMessage(error.message || "Registration failed. Please try again.");
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Failed</AlertTitle>
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}
      
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
