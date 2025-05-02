
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
import { Loader2, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sessionLogger } from "@/utils/sessionLogging";

interface Conversation {
  id: string;
  title: string;
  topic: string | null;
  last_message_at: string;
}

const ChatWithAI = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
    
    // Update session topic if we have an active session
    if (sessionId && sessionLogger.hasActiveSession()) {
      sessionLogger.updateTopic(e.target.value).catch(err => {
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
        const performanceData = {
          completedTime: new Date().toISOString(),
          conversationsViewed: conversations.length
        };
        
        sessionLogger.endSession(performanceData).catch(error => {
          console.error("Error ending session on unmount:", error);
        });
      }
    };
  }, [conversations.length]);

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
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
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
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Past Conversations</CardTitle>
                  <Button variant="outline" size="sm" onClick={loadConversations}>
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingConversations ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">
                      No conversations yet. Start chatting!
                    </p>
                  ) : (
                    <ScrollArea className="h-[240px] pr-4">
                      <ul className="space-y-2">
                        {conversations.map((convo) => (
                          <li key={convo.id}>
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-left h-auto py-2 px-3"
                              onClick={() => selectConversation(convo.id)}
                            >
                              <div className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  <span className="font-medium truncate max-w-[180px]">
                                    {convo.title || "Untitled Conversation"}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(convo.last_message_at)}
                                </span>
                                {convo.topic && (
                                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                    {convo.topic}
                                  </span>
                                )}
                              </div>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
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
