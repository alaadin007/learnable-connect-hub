
import React, { useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Footer from "@/components/landing/Footer";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  
  // Redirect authenticated users
  useEffect(() => {
    if (user && userRole) {
      const redirectPath = userRole === "school" || userRole === "school_admin" 
        ? "/admin"
        : userRole === "teacher" 
        ? "/teacher/analytics" 
        : "/dashboard";
        
      navigate(redirectPath, { replace: true });
    }
  }, [user, userRole, navigate]);

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
