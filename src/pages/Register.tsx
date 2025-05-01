
import React from "react";
import Navbar from "@/components/layout/Navbar";
import RegisterForm from "@/components/auth/RegisterForm";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        <RegisterForm />
        
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
          <p className="text-amber-800 text-center">
            Need test accounts? <Link to="/test-accounts" className="font-semibold text-amber-700 underline">Create test accounts here</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;
