
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import AIChatInterface from "@/components/chat/AIChatInterface";

const ChatWithAI = () => {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Chat with AI</h1>
            <p className="text-gray-600">
              Get personalized help from our AI learning assistant
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <AIChatInterface />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatWithAI;
