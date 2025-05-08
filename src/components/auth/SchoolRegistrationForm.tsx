
import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail, AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SchoolRegistrationFormFields from "./SchoolRegistrationFormFields";
import SchoolRegistrationSuccess from "./SchoolRegistrationSuccess";
import { SchoolRegistrationFormValues } from "./schoolRegistrationSchema";
import { checkIfEmailExists, checkEmailExistingRole } from "./schoolRegistrationUtils";

const SchoolRegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [schoolCode, setSchoolCode] = React.useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);
  const [existingEmailError, setExistingEmailError] = React.useState<string | null>(null);
  const [existingUserRole, setExistingUserRole] = React.useState<string | null>(null);

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
        setExistingEmailError(data.adminEmail);
        
        // Try to get the role for this existing email
        const userRole = await checkEmailExistingRole(data.adminEmail);
        if (userRole) {
          setExistingUserRole(userRole);
        }
        
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
      const { data: responseData, error } = await supabase.functions.invoke("register-school", {
        body: {
          schoolName: data.schoolName,
          adminEmail: data.adminEmail,
          adminPassword: data.adminPassword,
          adminFullName: data.adminFullName,
        },
      });

      // Dismiss the loading toast
      toast.dismiss(loadingToast);

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

      if (responseData.success) {
        // Store the email and school code for potential later use
        setRegisteredEmail(data.adminEmail);
        setSchoolCode(responseData.schoolCode);
        
        // Set email sent state
        setEmailSent(true);
        
        // Show success message with school details and clear confirmation about email
        toast.success(
          `School "${data.schoolName}" successfully registered!`,
          {
            description: `Your school code is: ${responseData.schoolCode}. ${responseData.emailSent ? 
              "Please check your email to complete verification." : 
              "There was an issue sending the verification email. You can request another one below."}`,
            duration: 10000, // Show for 10 seconds
          }
        );
        
        // We don't auto-login since email needs to be verified first
        toast.info(
          "Email verification required",
          {
            description: "Please check your inbox and spam folders for the verification email. If you don't receive it within a few minutes, you can request another verification email using the button below.",
            duration: 15000,
            icon: <Mail className="h-4 w-4" />,
          }
        );
        
        // If email wasn't sent successfully, show a warning
        if (!responseData.emailSent) {
          toast.warning(
            "Email delivery issue",
            {
              description: "We couldn't confirm if the verification email was sent successfully. If you don't receive it, please use the 'Request Verification Email' button on the next screen.",
              duration: 10000,
              icon: <AlertTriangle className="h-4 w-4" />,
            }
          );
        }
      } else {
        toast.error(`Registration failed: ${responseData.error || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      toast.error(`An unexpected error occurred: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show a different UI when email has been sent
  if (emailSent && registeredEmail) {
    return (
      <SchoolRegistrationSuccess 
        registeredEmail={registeredEmail} 
        schoolCode={schoolCode} 
      />
    );
  }

  return (
    <SchoolRegistrationFormFields 
      onSubmit={onSubmit}
      isLoading={isLoading}
      existingEmailError={existingEmailError}
      existingUserRole={existingUserRole}
    />
  );
};

export default SchoolRegistrationForm;
