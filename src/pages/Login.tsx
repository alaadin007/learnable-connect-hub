
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import LoginForm from "@/components/auth/LoginForm";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  // Since dbError doesn't exist in AuthContext, create a local state for it
  const [dbError, setDbError] = useState<boolean>(false);
  
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

        {dbError && (
          <div className="max-w-md w-full mx-auto mb-4">
            <Alert variant="destructive" className="bg-red-100 border-l-4 border-red-500">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-800">Database Connection Issue</AlertTitle>
              <AlertDescription className="text-red-700">
                There might be an issue connecting to the database. If you experience login problems, please try the test accounts instead.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        <LoginForm />
      </main>
      <Footer />
    </div>
  );
};

export default Login;
