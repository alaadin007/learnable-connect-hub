
import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface SchoolRegistrationSuccessProps {
  registeredEmail: string | null;
  schoolCode: string | null;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const SchoolRegistrationSuccess: React.FC<SchoolRegistrationSuccessProps> = ({
  registeredEmail,
  schoolCode,
  isLoading,
  setIsLoading,
}) => {
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    if (!registeredEmail) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(registeredEmail, {
        redirectTo: window.location.origin + "/login?email_confirmed=true",
      });
      
      if (error) {
        toast.error("Failed to send verification email: " + error.message);
      } else {
        toast.success("Verification email sent. Please check your inbox and spam folder.");
      }
    } catch (error: any) {
      toast.error("An error occurred: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="bg-green-100 text-green-800 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Mail className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold mb-3 gradient-text">Registration Successful!</h2>
        <p className="text-gray-600 mb-4">
          Your school has been successfully registered. We've sent a verification email to your address.
          Please check your inbox (and spam folder) to verify your email before logging in.
        </p>
        
        {schoolCode && (
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertTitle className="text-amber-800">Important: Save Your School Code</AlertTitle>
            <AlertDescription className="text-amber-700">
              Your school code is: <span className="font-bold">{schoolCode}</span>
              <br />
              Please save this code - you'll need it to add teachers and students to your school.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <Button 
            variant="default" 
            className="w-full gradient-bg" 
            onClick={() => navigate("/login", { 
              state: { 
                registeredEmail: registeredEmail,
                verificationRequired: true
              }
            })}
          >
            Go to Login
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleResetPassword}
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
    </div>
  );
};

export default SchoolRegistrationSuccess;
