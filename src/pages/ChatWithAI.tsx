
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare } from "lucide-react";

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

          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <MessageSquare className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Chat Interface Coming Soon</h2>
            <p className="text-gray-600 mb-4">
              The AI chat functionality is currently under development. Check back soon!
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatWithAI;
