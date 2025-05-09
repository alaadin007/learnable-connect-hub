
import React, { useState, useEffect } from "react";
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
import { supabase, verifySchoolCode } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Check, HelpCircle, Info } from "lucide-react";

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
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidationState, setCodeValidationState] = useState<{
    isValid: boolean | null;
    schoolName: string | null;
  }>({ isValid: null, schoolName: null });

  const [recentCodes, setRecentCodes] = useState<string[]>([]);

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

  // Load recent codes from localStorage
  useEffect(() => {
    try {
      // Scan localStorage for any school code entries
      const allCodes: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('school_code_history_')) {
          const history = JSON.parse(localStorage.getItem(key) || '[]');
          allCodes.push(...history);
        }
      }
      
      // Remove duplicates and take the most recent 5
      const uniqueCodes = [...new Set(allCodes)].slice(0, 5);
      setRecentCodes(uniqueCodes);
    } catch (error) {
      console.error("Error loading recent codes:", error);
    }
  }, []);

  // Validate school code when it changes
  const schoolCode = form.watch("schoolCode");
  
  useEffect(() => {
    const validateCode = async () => {
      if (!schoolCode || schoolCode.length < 4) {
        setCodeValidationState({ isValid: null, schoolName: null });
        return;
      }
      
      setIsValidatingCode(true);
      try {
        const result = await verifySchoolCode(schoolCode);
        setCodeValidationState({ 
          isValid: result.valid, 
          schoolName: result.schoolName || null 
        });
      } catch (error) {
        console.error("Error validating code:", error);
        setCodeValidationState({ isValid: null, schoolName: null });
      } finally {
        setIsValidatingCode(false);
      }
    };
    
    const timeoutId = setTimeout(validateCode, 500);
    return () => clearTimeout(timeoutId);
  }, [schoolCode]);

  const handleSelectRecentCode = (code: string) => {
    form.setValue("schoolCode", code);
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // First verify if the school code is valid using our function
      const { data: schoolInfoArray, error: validationError } = await supabase
        .rpc('verify_and_link_school_code', { code: data.schoolCode });
      
      if (validationError) {
        console.error("Error verifying school code:", validationError);
        throw new Error(validationError.message || "Invalid school code. Please check and try again.");
      }

      // schoolInfo is an array, so we need to get the first element
      if (!schoolInfoArray || schoolInfoArray.length === 0 || !schoolInfoArray[0].valid) {
        throw new Error("Invalid school code. Please check and try again.");
      }

      // Extract the school details from the validation result (from first element of array)
      const schoolInfo = schoolInfoArray[0];
      const schoolId = schoolInfo.school_id;
      const schoolName = schoolInfo.school_name;
      
      if (!schoolId) {
        throw new Error("Could not find school information. Please check your school code.");
      }
      
      console.log("School validation successful:", {
        schoolId,
        schoolName,
        code: data.schoolCode
      });
      
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
      
      // Save the used code to the history if it's not already there
      try {
        const historyKey = `school_code_history_${schoolId}`;
        const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        if (!currentHistory.includes(data.schoolCode)) {
          localStorage.setItem(historyKey, JSON.stringify([data.schoolCode, ...currentHistory].slice(0, 10)));
        }
      } catch (error) {
        console.error("Error updating code history:", error);
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
              <div className="flex justify-between">
                <FormLabel>School Code</FormLabel>
                {recentCodes.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
                        <Info className="h-3 w-3 mr-1" />
                        Recent codes
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-fit">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Recent school codes</p>
                        <div className="flex flex-col gap-1">
                          {recentCodes.map((code) => (
                            <Button
                              key={code}
                              variant="ghost"
                              size="sm"
                              className="justify-start h-8 text-left font-mono"
                              onClick={() => handleSelectRecentCode(code)}
                            >
                              {code}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <FormControl>
                <div className="relative">
                  <Input placeholder="Enter your school code" {...field} />
                  {isValidatingCode && (
                    <div className="absolute right-3 top-2.5">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    </div>
                  )}
                  {!isValidatingCode && codeValidationState.isValid === true && (
                    <div className="absolute right-3 top-2.5 text-green-500">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </FormControl>
              {codeValidationState.isValid === true && codeValidationState.schoolName && (
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <Check className="h-3 w-3" />
                  <span>Valid code for: {codeValidationState.schoolName}</span>
                </div>
              )}
              {codeValidationState.isValid === false && schoolCode && (
                <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <Info className="h-3 w-3" />
                  <span>Invalid school code. Please check and try again.</span>
                </div>
              )}
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
          disabled={isLoading || codeValidationState.isValid === false}
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
