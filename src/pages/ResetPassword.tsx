
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import ResetPassword from "@/components/auth/ResetPassword";

const ResetPasswordPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10 px-4">
        <ResetPassword />
      </main>
      <Footer />
    </div>
  );
};

export default ResetPasswordPage;
