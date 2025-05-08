
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="relative overflow-hidden bg-learnable-super-light py-16 sm:py-24">
      <div className="absolute inset-0 z-0 opacity-10">
        <svg
          className="h-full w-full"
          fill="none"
          viewBox="0 0 1000 1000"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fade-in">
            <span className="gradient-text">LearnAble</span>
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-learnable-gray mb-10 animate-fade-in delay-100">
            Empowering education through intelligent conversations
          </p>
          <p className="text-lg text-learnable-gray mb-12 animate-fade-in delay-200">
            Connect students and teachers with AI-powered learning tools designed for schools
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-in">
            <Button asChild className="gradient-bg text-white font-semibold px-8 py-6 text-lg">
              <Link to="/register">Get Started</Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              className="bg-white border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-8 py-6 text-lg"
            >
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
