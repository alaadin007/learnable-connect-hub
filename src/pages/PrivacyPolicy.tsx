
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose max-w-none">
          <p className="mb-4">Last updated: May 2, 2025</p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-3">Introduction</h2>
          <p className="mb-4">
            This Privacy Policy describes how Learnable ("we", "us", or "our") collects, uses, and discloses your personal information when you use our educational platform.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-3">Information We Collect</h2>
          <p className="mb-4">
            We collect information that you provide directly to us when you register for an account, create or modify your profile, and use the features of our platform.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-3">How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to provide, maintain, and improve our services, including to develop new features and functionality.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-3">Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect the security of your personal information.
          </p>
          
          <h2 className="text-2xl font-semibold mt-6 mb-3">Contact Us</h2>
          <p className="mb-4">
            If you have questions about this Privacy Policy, please contact us at privacy@learnable.edu.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
