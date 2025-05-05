
import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import AIChatInterface from "@/components/chat/AIChatInterface";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

const ChatWithAI = () => {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">Chat with AI</h1>
              <p className="text-gray-600">
                Get personalized help from our AI learning assistant
              </p>
            </div>
            <Link to="/ai-settings">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                AI Settings
              </Button>
            </Link>
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
