
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Import the refactored components
import SchoolRegistrationFormFields, { 
  SchoolRegistrationFormValues 
} from "./SchoolRegistrationFormFields";
import SchoolRegistrationSuccess from "./SchoolRegistrationSuccess";
import EmailExistsAlert from "./EmailExistsAlert";
import { 
  checkEmailExistingRole, 
  checkIfEmailExists 
} from "@/services/emailVerificationService";

// Define form schema with validations
const schoolRegistrationSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters"),
  adminFullName: z.string().min(3, "Full name must be at least 3 characters"),
  adminEmail: z.string().email("Please enter a valid email address"),
  adminPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).*$/,
      "Password must contain at least one letter and one number"
    ),
  confirmPassword: z.string(),
}).refine(data => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], 
});

const SchoolRegistrationForm: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [schoolCode, setSchoolCode] = React.useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);
  const [existingEmailError, setExistingEmailError] = React.useState<string | null>(null);
  const [existingUserRole, setExistingUserRole] = React.useState<string | null>(null);

  // Initialize form
  const form = useForm<SchoolRegistrationFormValues>({
    resolver: zodResolver(schoolRegistrationSchema),
    defaultValues: {
      schoolName: "",
      adminFullName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SchoolRegistrationFormValues) => {
    setIsLoading(true);
    setExistingEmailError(null);
    setExistingUserRole(null);
    
    try {
      // Display toast notification that registration is in progress
      const loadingToast = toast.loading("Registering your school...");
      
      // Check if email already exists
      const emailExists = await checkIfEmailExists(data.adminEmail);
      
      if (emailExists) {
        toast.dismiss(loadingToast);
        const userRole = await checkEmailExistingRole(data.adminEmail);
        setExistingUserRole(userRole);
        setExistingEmailError(data.adminEmail);
        
        const roleMessage = userRole 
          ? `This email is already registered as a ${userRole}`
          : "This email is already registered";
          
        toast.error(
          roleMessage,
          {
            description: "Please use a different email address. Each user can only have one role in the system.",
            duration: 8000,
            icon: <AlertCircle className="h-5 w-5" />,
          }
        );
        setIsLoading(false);
        return;
      }
      
      // Call our edge function to register the school
      const response = await supabase.functions.invoke<{
        success?: boolean;
        error?: string;
        details?: string;
        schoolId?: string;
        schoolCode?: string;
        adminUserId?: string;
        emailSent?: boolean;
        emailError?: string | null;
        message?: string;
      }>("register-school", {
        body: {
          schoolName: data.schoolName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          adminFullName: data.adminFullName,
        },
      });
      
      // Dismiss the loading toast
      toast.dismiss(loadingToast);
      
      const { data: responseData, error } = response;

      if (error) {
        console.error("School registration error:", error);
        
        // Check if this is an "email already exists" error
        const errorMessage = error.message || "";
        if (errorMessage.includes("non-2xx status code") || errorMessage.includes("already registered")) {
          // Try to get the role for this existing email
          const userRole = await checkEmailExistingRole(data.adminEmail);
          setExistingUserRole(userRole);
          
          // Set the existing email error to guide the user
          setExistingEmailError(data.adminEmail);
          
          const roleMessage = userRole 
            ? `This email is already registered as a ${userRole}`
            : "This email is already registered";
            
          toast.error(
            roleMessage,
            {
              description: "Please use a different email address. Each user can only have one role in the system.",
              duration: 8000,
              icon: <AlertCircle className="h-5 w-5" />,
            }
          );
        } else {
          toast.error(`Registration failed: ${error.message || "Unknown error"}`);
        }
        setIsLoading(false);
        return;
      }

      if (responseData?.error) {
        console.error("Server error:", responseData.error, responseData.details);
        
        // Handle specific error cases
        if (responseData.error === "Email already registered" || 
            (responseData.details && responseData.details.includes("already registered"))) {
          
          // Try to get the role for this existing email
          const userRole = await checkEmailExistingRole(data.adminEmail);
          setExistingUserRole(userRole);
          
          setExistingEmailError(data.adminEmail);
          
          const roleMessage = userRole 
            ? `This email is already registered as a ${userRole}`
            : "This email is already registered";
            
          toast.error(
            roleMessage,
            {
              description: "Please use a different email address. Each user can only have one role in the system.",
              duration: 8000,
              icon: <AlertCircle className="h-5 w-5" />,
            }
          );
        } else {
          toast.error(`Registration failed: ${responseData.error}`);
        }
        setIsLoading(false);
        return;
      }

      if (responseData?.success) {
        // Store the email and school code for potential later use
        setRegisteredEmail(data.adminEmail);
        setSchoolCode(responseData.schoolCode);
        
        // Set email sent state
        setEmailSent(true);
        
        // Show success message with school details
        toast.success(
          `School "${data.schoolName}" successfully registered!`,
          {
            description: `Your school code is: ${responseData.schoolCode}. Please check your email to verify your account before logging in.`,
            duration: 10000, // Show for 10 seconds
          }
        );
      } else {
        toast.error(`Registration failed: ${responseData?.error || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(`An unexpected error occurred: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show a different UI when email has been sent
  if (emailSent) {
    return (
      <SchoolRegistrationSuccess
        registeredEmail={registeredEmail}
        schoolCode={schoolCode}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6 text-center gradient-text">Register Your School</h2>
        
        {existingEmailError && (
          <EmailExistsAlert 
            email={existingEmailError}
            userRole={existingUserRole}
          />
        )}
        
        <SchoolRegistrationFormFields
          form={form}
          isLoading={isLoading}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
};

export default SchoolRegistrationForm;
