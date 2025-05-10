
import React, { useEffect, useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Footer from "@/components/landing/Footer";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, checkSupabaseConnection } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Login = () => {
  const { user, userRole, session, isLoading } = useAuth();
  const navigate = useNavigate();
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [connectionChecked, setConnectionChecked] = useState<boolean>(false);
  
  // Check Supabase connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkSupabaseConnection();
        setConnectionError(!isConnected);
        setConnectionChecked(true);
      } catch (err) {
        console.error("Connection check failed:", err);
        setConnectionError(true);
        setConnectionChecked(true);
      }
    };
    
    checkConnection();
  }, []);
  
  // Retry connection if there was an error
  const retryConnection = async () => {
    setConnectionChecked(false);
    setConnectionError(false);
    
    try {
      const isConnected = await checkSupabaseConnection();
      setConnectionError(!isConnected);
      setConnectionChecked(true);
      
      if (isConnected) {
        toast.success("Connection Restored", {
          description: "Successfully reconnected to the database."
        });
      }
    } catch (err) {
      console.error("Retry connection failed:", err);
      setConnectionError(true);
      setConnectionChecked(true);
    }
  };
  
  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    // Only proceed with redirection if auth state is loaded
    if (!isLoading) {
      console.log("Login.tsx: Auth state loaded. User:", !!user, "Session:", !!session, "Role:", userRole);
      
      // If user is authenticated and we have all required information
      if (user && session) {
        console.log("Login.tsx: Redirecting authenticated user with role:", userRole);
        
        // Determine where to redirect based on user role
        if (userRole === "school" || userRole === "school_admin") {
          navigate("/admin", { replace: true });
        } else if (userRole === "teacher") {
          navigate("/teacher/analytics", { replace: true }); 
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    }
  }, [user, userRole, navigate, session, isLoading]);

  // Render a loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-learnable-super-light">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-learnable-blue border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        {connectionError && connectionChecked && (
          <Alert variant="destructive" className="mb-6 max-w-md w-full mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <span>Database connection issue. Please try again later.</span>
              <button 
                onClick={retryConnection}
                className="px-3 py-1 bg-red-900/20 hover:bg-red-900/30 rounded-md text-sm transition-colors"
              >
                Retry
              </button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="max-w-md w-full mx-auto mb-6">
          <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-md shadow">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-800 font-medium">
                  Testing the application?
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  You can quickly create test accounts for all user roles (school admin, teacher, student) on our dedicated test page.
                </p>
                <div className="mt-2">
                  <Link 
                    to="/test-accounts" 
                    className="text-sm text-amber-800 font-semibold hover:text-amber-900 bg-amber-200 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Access Test Accounts →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {(!connectionError || !connectionChecked) && <LoginForm />}
        
        {connectionError && connectionChecked && (
          <div className="mt-4 text-center">
            <p className="text-gray-600 mb-4">Having trouble connecting?</p>
            <p className="text-gray-700">
              The application requires a working database connection. Please check your internet connection and try again.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Login;
