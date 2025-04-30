
import React from "react";
import Navbar from "@/components/layout/Navbar";
import RegisterForm from "@/components/auth/RegisterForm";
import Footer from "@/components/landing/Footer";

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex items-center justify-center py-10">
        <RegisterForm />
      </main>
      <Footer />
    </div>
  );
};

export default Register;
