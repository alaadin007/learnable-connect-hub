
import React from "react";
import Navbar from "@/components/layout/Navbar";
import RegisterForm from "@/components/auth/RegisterForm";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { Toaster } from "sonner";

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        <div className="max-w-md w-full mx-auto mb-6">
          <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-md shadow">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
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
                    Create Test Accounts →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto mb-6">
          <div className="bg-blue-100 border border-blue-500 p-6 rounded-md shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-500 text-white rounded-full p-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-blue-800">
                  Registering for a School?
                </h3>
                <p className="mt-2 text-blue-700">
                  If you're registering on behalf of a school and need to set up an administrator account, please use our dedicated school registration page.
                </p>
                <div className="mt-4">
                  <Link 
                    to="/school-registration" 
                    className="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors duration-200"
                  >
                    School Registration →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <RegisterForm />
      </main>
      <Footer />
      <Toaster />
    </div>
  );
};

export default Register;
