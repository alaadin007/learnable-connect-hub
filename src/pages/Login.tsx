
import React, { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import LoginForm from "@/components/auth/LoginForm";
import Footer from "@/components/landing/Footer";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get intended destination from state (if user was redirected to login)
  const from = location.state?.from?.pathname;
  
  // Immediately redirect logged-in users to appropriate dashboard
  useEffect(() => {
    if (isLoading) return; // Don't redirect while still loading
    
    if (user && userRole) {
      // Determine where to redirect based on user role
      let redirectPath = from || '/dashboard';
      
      if (userRole === 'school' || userRole === 'school_admin') {
        redirectPath = from || '/admin';
      } else if (userRole === 'teacher' || userRole === 'teacher_supervisor') {
        redirectPath = from || '/teacher/analytics';
      }
      
      console.log(`Login: Redirecting logged-in user to ${redirectPath}`);
      toast.success(`Welcome back, ${user.user_metadata?.full_name || 'User'}!`);
      navigate(redirectPath, { replace: true });
    }
  }, [user, userRole, isLoading, navigate, from]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        <div className="max-w-md w-full mx-auto mb-6">
          <Alert className="bg-amber-100 border-l-4 border-amber-500">
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
          </Alert>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-learnable-blue"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : (
          <LoginForm />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Login;
