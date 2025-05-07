
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import SchoolRegistrationForm from "@/components/auth/SchoolRegistrationForm";
import { Toaster } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HelpCircle, AlertTriangle } from "lucide-react";

const SchoolRegistration = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        <div className="max-w-4xl w-full mx-auto px-4">
          <Alert className="bg-blue-50 border-l-4 border-blue-500 mb-6 max-w-2xl mx-auto">
            <HelpCircle className="h-5 w-5 text-blue-500" />
            <AlertTitle className="text-blue-800">Auth Configuration</AlertTitle>
            <AlertDescription className="text-blue-700">
              For authentication to work in production, make sure to set the Site URL and Redirect URLs in Supabase Auth settings to your deployed site URL.
            </AlertDescription>
          </Alert>

          <Alert className="bg-yellow-50 border-l-4 border-yellow-500 mb-6 max-w-2xl mx-auto">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertTitle className="text-yellow-800">Important Notice</AlertTitle>
            <AlertDescription className="text-yellow-700">
              If you get "requested path is invalid" errors during registration, please make sure your Supabase project has the correct Site URL and Redirect URLs configured in Authentication Settings.
            </AlertDescription>
          </Alert>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4 gradient-text">Register Your School</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Welcome to LearnAble! Register your school to get started with our platform.
              You'll be set up as the school administrator with full access to manage teachers and students.
            </p>
          </div>

          <SchoolRegistrationForm />

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              By registering, you agree to our{" "}
              <a href="/terms" className="underline hover:text-learnable-blue">Terms of Service</a> and{" "}
              <a href="/privacy" className="underline hover:text-learnable-blue">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
};

export default SchoolRegistration;
