
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import AIChatInterface from "@/components/chat/AIChatInterface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const ChatWithAI = () => {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [documentId, setDocumentId] = useState(searchParams.get("documentId") || "");
  const [activeTopic, setActiveTopic] = useState(searchParams.get("topic") || "");
  const [activeDocumentId, setActiveDocumentId] = useState(searchParams.get("documentId") || "");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveTopic(topic);
    setActiveDocumentId(documentId);
    
    // Update URL with search params without refreshing the page
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (documentId) params.set("documentId", documentId);
    navigate({ search: params.toString() });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Chat with AI</h1>
            <p className="text-learnable-gray">
              Get help with your studies by asking questions to our AI assistant
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Study Settings</CardTitle>
                  <CardDescription>Set a topic to focus your learning</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="topic" className="text-sm font-medium">
                        Current Topic
                      </label>
                      <Input
                        id="topic"
                        placeholder="E.g., Algebra, World History, Chemistry..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      />
                    </div>
                    {/* Document selection would go here in a future update */}
                    <Button type="submit" className="w-full">
                      <Search className="mr-2 h-4 w-4" />
                      Start Studying
                    </Button>
                  </form>
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Study Tips</CardTitle>
                  <CardDescription>Make the most of your AI assistant</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 list-disc pl-5">
                    <li>Be specific with your questions</li>
                    <li>Ask for explanations when you don't understand</li>
                    <li>Request examples to reinforce concepts</li>
                    <li>Use follow-up questions to dive deeper</li>
                    <li>Summarize what you've learned to check understanding</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <AIChatInterface 
                topic={activeTopic} 
                documentId={activeDocumentId} 
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatWithAI;
