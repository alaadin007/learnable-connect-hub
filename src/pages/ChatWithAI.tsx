
import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import ChatInterface from "@/components/chat/ChatInterface";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { ConversationList } from "@/components/chat/ConversationList";
import { sessionLogger } from "@/utils/sessionLogger";

interface Conversation {
  id: string;
  title: string;
  topic: string | null;
  last_message_at: string;
  starred?: boolean;
  tags?: string[];
  category?: string;
  summary?: string;
}

const ChatWithAI = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [categoryInput, setCategoryInput] = useState<string>("");

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
    
    // Update session topic if we have an active session
    if (sessionId && sessionLogger.hasActiveSession()) {
      sessionLogger.updateTopic(sessionId, e.target.value).catch(err => {
        console.error("Failed to update session topic:", err);
      });
    }
  };

  const handleSessionStart = (newSessionId: string) => {
    setSessionId(newSessionId);
    toast({
      title: "Session started",
      description: `Your learning session has been started.`,
    });
  };

  // Load user's conversation history
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);
  
  // End session when user leaves page
  useEffect(() => {
    return () => {
      if (sessionLogger.hasActiveSession()) {
        sessionLogger.endSession(sessionId || '', {
          completedTime: new Date().toISOString(),
          conversationsViewed: conversations.length
        }).catch(error => {
          console.error("Error ending session on unmount:", error);
        });
      }
    };
  }, [conversations.length, sessionId]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(20);
      
      if (error) {
        throw error;
      }
      
      setConversations(data || []);
    } catch (error: any) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load your conversation history.",
        variant: "destructive",
      });
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const startNewConversation = () => {
    setSelectedConversationId(null);
    setCategoryInput("");
  };
  
  const updateConversationCategory = async () => {
    if (!selectedConversationId || !categoryInput.trim()) return;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ category: categoryInput.trim() })
        .eq('id', selectedConversationId);
      
      if (error) throw error;
      
      // Update local state
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === selectedConversationId 
            ? { ...conv, category: categoryInput.trim() } 
            : conv
        )
      );
      
      toast({
        title: "Category updated",
        description: "The conversation category has been updated.",
      });
    } catch (error: any) {
      console.error("Error updating category:", error);
      toast({
        title: "Error",
        description: "Failed to update conversation category.",
        variant: "destructive",
      });
    }
  };
  
  const toggleStarConversation = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    const newStarredState = !conversation.starred;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ starred: newStarredState })
        .eq('id', conversationId);
      
      if (error) throw error;
      
      // Update local state
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, starred: newStarredState } 
            : conv
        )
      );
    } catch (error: any) {
      console.error("Error toggling star:", error);
      toast({
        title: "Error",
        description: "Failed to update conversation.",
        variant: "destructive",
      });
    }
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
                selectedConversationId={selectedConversationId}
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
              
              <ConversationList 
                conversations={conversations}
                loadingConversations={loadingConversations}
                onSelectConversation={selectConversation}
                onStartNewConversation={startNewConversation}
                onRefreshConversations={loadConversations}
              />
              
              {selectedConversationId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Conversation Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="category" 
                          value={categoryInput}
                          onChange={(e) => setCategoryInput(e.target.value)}
                          placeholder="E.g. Homework, Research, Exam Prep..."
                        />
                        <Button 
                          variant="outline" 
                          onClick={updateConversationCategory}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Button 
                        variant="outline" 
                        onClick={() => toggleStarConversation(selectedConversationId)}
                        className="w-full"
                      >
                        {conversations.find(c => c.id === selectedConversationId)?.starred 
                          ? "Remove Star" 
                          : "Star Conversation"
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
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
