
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AIChatInterface from "@/components/chat/AIChatInterface";
import PersistentChatInterface from "@/components/chat/PersistentChatInterface";
import ChatHistory from "@/components/chat/ChatHistory";

const ChatPage = () => {
  const { user, isLoading } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
  };

  const handleConversationCreated = (id: string) => {
    setActiveConversationId(id);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">AI Learning Assistant</h1>
            <p className="text-gray-600">
              Get personalized help with your studies and explore topics in depth
            </p>
          </div>

          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="chat">Simple Chat</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Chat</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-4">
              <div className="bg-white rounded-lg shadow-md p-4 mb-8">
                <AIChatInterface 
                  placeholder="Ask me anything about your studies..."
                  autoSaveHistory={true}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="md:col-span-1">
                  <ChatHistory
                    onSelectConversation={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                    activeConversationId={activeConversationId}
                  />
                </div>
                <div className="md:col-span-3">
                  <PersistentChatInterface
                    conversationId={activeConversationId}
                    onConversationCreated={handleConversationCreated}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatPage;
