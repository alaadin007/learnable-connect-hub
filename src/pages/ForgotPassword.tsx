
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import ForgotPassword from "@/components/auth/ForgotPassword";

const ForgotPasswordPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10 px-4">
        <ForgotPassword />
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPasswordPage;
