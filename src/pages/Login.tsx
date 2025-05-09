import React, { useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Footer from "@/components/landing/Footer";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const { user, userRole, session, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Check Supabase connection on component mount
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        // Simple ping test to verify API key is working
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
          console.error("Supabase connection error:", error);
          
          if (error.message.includes('No API key found')) {
            // Force refresh the session and reset API key in headers
            const freshSession = await refreshAuthSession();
            if (!freshSession) {
              toast.error("Could not establish connection to database. Please refresh the page.");
            }
          }
        }
      } catch (err) {
        console.error("Failed to check Supabase connection:", err);
        toast.error("Connection error. Please refresh the page.");
      }
    };
    
    checkSupabaseConnection();
  }, []);
  
  // Immediately redirect authenticated users without delay
  useEffect(() => {
    // Only proceed with redirection if auth state is loaded
    if (!isLoading) {
      console.log("Login.tsx: Auth state loaded. User:", !!user, "Session:", !!session, "Role:", userRole);
      
      // If we have all the required information for an authenticated user
      if (user && session && userRole) {
        console.log("Login.tsx: Redirecting authenticated user with role:", userRole);
        
        let redirectPath;
        
        if (userRole === "school" || userRole === "school_admin") {
          redirectPath = "/admin";
        } else if (userRole === "teacher") {
          redirectPath = "/teacher/analytics"; 
        } else {
          redirectPath = "/dashboard";
        }
        
        // Immediate redirect with no timeout
        navigate(redirectPath, { 
          replace: true, 
          state: { 
            preserveContext: true,
            timestamp: Date.now()
          }
        });
      }
    }
  }, [user, userRole, navigate, session, isLoading]);

  // Render a loading state while checking auth - keep it minimal
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-learnable-super-light">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-learnable-blue border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">Checking auth status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center">
                <span className="ml-2 text-xl font-bold gradient-text">LearnAble</span>
              </Link>
            </div>
            
            <div className="flex space-x-4">
              <Link to="/test-accounts" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Test Accounts
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
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
        <LoginForm />
      </main>
      <Footer />
    </div>
  );
};

export default Login;
