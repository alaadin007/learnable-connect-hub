
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Features from "@/components/landing/Features";
import Footer from "@/components/layout/Footer";

const FeaturesPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-8 text-center gradient-text">LearnAble Features</h1>
          <Features />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FeaturesPage;
