
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import LoginForm from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const registered = searchParams.get("registered");
    const completeRegistration = searchParams.get("completeRegistration");
    const userId = searchParams.get("userId");
    
    if (registered === "true") {
      toast.success("Registration successful!", {
        description: "Please check your email to verify your account."
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
  }, [location.search]);

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
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Button variant="link" className="p-0" onClick={() => navigate("/register")}>
                Sign up
              </Button>
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default Login;
