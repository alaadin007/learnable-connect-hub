
import React from "react";
import Navbar from "@/components/layout/Navbar";
import LoginForm from "@/components/auth/LoginForm";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { AlertCircle, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        <div className="max-w-md w-full mx-auto mb-6">
          <Alert className="bg-blue-50 border-l-4 border-blue-500 mb-4">
            <HelpCircle className="h-5 w-5 text-blue-500" />
            <AlertTitle className="text-blue-800">Auth Configuration</AlertTitle>
            <AlertDescription className="text-blue-700">
              For authentication to work in production, make sure to set the Site URL and Redirect URLs in Supabase Auth settings to your deployed site URL.
            </AlertDescription>
          </Alert>
          
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
