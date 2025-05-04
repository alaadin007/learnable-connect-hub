
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import SchoolRegistrationForm from "@/components/auth/SchoolRegistrationForm";
import { Toaster } from "sonner";

const SchoolRegistration = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        <div className="max-w-4xl w-full mx-auto px-4">
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
              By registering, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default SchoolRegistration;
