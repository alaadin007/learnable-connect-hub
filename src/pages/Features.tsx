
import React from "react";
import Navbar from "@/components/layout/Navbar";
import FeaturesSection from "@/components/landing/Features"; // Rename import to avoid conflict
import Footer from "@/components/layout/Footer";

const FeaturesPage = () => {
  React.useEffect(() => {
    console.log("Features page loaded");
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-8 text-center gradient-text">LearnAble Features</h1>
          <FeaturesSection />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FeaturesPage;
