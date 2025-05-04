
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import LoginForm from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationEmail } from "@/utils/authHelpers";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const registered = searchParams.get("registered");
    const completeRegistration = searchParams.get("completeRegistration");
    const emailVerificationFailed = searchParams.get("emailVerificationFailed");
    
    if (registered === "true") {
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
      });
    }
    
    if (emailVerificationFailed === "true") {
      toast.error("Email verification failed", {
        description: "Please try again or request a new verification email."
      });
    }
    
    const handleEmailConfirmation = async () => {
      // Check if this is a callback from email verification
      if (completeRegistration === "true") {
        const { data: { session } } = await supabase.auth.getSession();
        
        // If user is verified and logged in
        if (session?.user?.email_confirmed_at) {
          // Call complete-registration function with the user ID
          try {
            const userId = session.user.id;
            toast.loading("Finalizing your registration...");
            
            const response = await supabase.functions.invoke('complete-registration', {
              body: { userId }
            });
            
            if (response.error) {
              console.error("Error completing registration:", response.error);
              toast.error("Registration completion failed", { 
                description: response.error.message
              });
              return;
            }
            
            if (response.data && response.data.success) {
              toast.success("Registration completed!", { 
                description: "Your school has been registered successfully."
              });
              
              // Redirect to dashboard or home page
              setTimeout(() => {
                navigate("/");
              }, 1500);
            }
          } catch (error) {
            console.error("Error completing registration:", error);
            toast.error("Failed to complete registration");
          }
        }
      }
    };
    
    handleEmailConfirmation();
  }, [location.search, navigate]);

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resendEmail || !resendEmail.trim()) {
      setResendError("Please enter your email address");
      return;
    }

    setIsResending(true);
    setResendError(null);
    
    try {
      const result = await resendVerificationEmail(resendEmail.trim());
      
      if (result.success) {
        setResendDialogOpen(false);
        // Toast notification is already set in the function
      } else {
        setResendError(result.message);
      }
    } catch (error: any) {
      setResendError(`Failed to resend: ${error.message}`);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 gradient-text">Log in</h1>
            <p className="text-gray-600">
              Welcome back to LearnAble. Log in to continue helping students learn.
            </p>
          </div>
          
          <LoginForm />
          
          <div className="mt-8 text-center space-y-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Button variant="link" className="p-0" onClick={() => navigate("/register")}>
                Sign up
              </Button>
            </p>
            
            <p className="text-sm text-gray-600">
              <Button variant="link" className="p-0" onClick={() => setResendDialogOpen(true)}>
                Didn't receive verification email?
              </Button>
            </p>
          </div>
        </div>
      </main>
      <Footer />
      
      <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resend verification email</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a new verification link.
            </DialogDescription>
          </DialogHeader>
          
          {resendError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{resendError}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleResendSubmit}>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter className="sm:justify-end mt-4">
              <Button 
                variant="secondary" 
                onClick={() => setResendDialogOpen(false)}
                disabled={isResending}
                type="button"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isResending}
                className="ml-2"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send email"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default Login;
