
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import ChatInterface from "@/components/chat/ChatInterface";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ChatWithAI = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
  };

  const handleSessionStart = (newSessionId: string) => {
    setSessionId(newSessionId);
    toast({
      title: "Session started",
      description: `Your learning session has been started.`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold gradient-text mb-2">Chat with LearnAble AI</h1>
          <p className="text-learnable-gray mb-6">
            Ask questions and get instant help with your studies
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChatInterface 
                sessionId={sessionId} 
                topic={topic}
                onSessionStart={handleSessionStart} 
              />
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Study Topic</CardTitle>
                  <CardDescription>What are you learning about today?</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Input 
                      id="topic" 
                      value={topic}
                      onChange={handleTopicChange}
                      placeholder="E.g. Algebra, History, Chemistry..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Setting a topic helps us track your learning patterns
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Study Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span> 
                      Be specific with your questions
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span> 
                      Ask for explanations when you don't understand
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span> 
                      Request examples to help clarify concepts
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span> 
                      Try to rephrase complex problems
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatWithAI;
