
import React from "react";
import Navbar from "@/components/layout/Navbar";
import LoginForm from "@/components/auth/LoginForm";
import Footer from "@/components/landing/Footer";

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex items-center justify-center py-10">
        <LoginForm />
      </main>
      <Footer />
    </div>
  );
};

export default Login;
