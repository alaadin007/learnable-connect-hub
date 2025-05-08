
import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface SchoolRegistrationSuccessProps {
  registeredEmail: string;
  schoolCode: string | null;
}

const SchoolRegistrationSuccess: React.FC<SchoolRegistrationSuccessProps> = ({
  registeredEmail,
  schoolCode,
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

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
        <h2 className="text-2xl font-semibold mb-3 gradient-text">Check Your Email</h2>
        <p className="text-gray-600 mb-4">
          We've sent a verification link to your email address. Please check your inbox and spam folder and verify your account to continue.
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
            variant="outline" 
            className="w-full" 
            onClick={() => navigate("/login")}
          >
            Go to Login
          </Button>
          
          <Button
            variant="secondary"
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
              "Request Verification Email Again"
            )}
          </Button>
          
          <p className="text-sm text-gray-500">
            If you don't receive an email, check your spam folder or request another verification email using the button above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistrationSuccess;
