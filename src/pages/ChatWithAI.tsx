import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import PersistentChatInterface from "@/components/chat/PersistentChatInterface";
import ChatHistory from "@/components/chat/ChatHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { isSchoolAdmin, getUserRoleWithFallback } from "@/utils/apiHelpers";
import { UserRole } from "@/components/auth/ProtectedRoute";

const ChatWithAI = () => {
  const { user, profile, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [activeTopic, setActiveTopic] = useState(searchParams.get("topic") || "");
  const [conversationId, setConversationId] = useState<string | null>(searchParams.get("conversationId") || null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect if user is not logged in
    if (!user) {
      navigate("/login", { state: { from: "/chat" } });
      return;
    }

    // Check if user is a school admin and came from another page
    const fallbackRole = getUserRoleWithFallback();
    const effectiveRole = userRole || fallbackRole;
    const isAdmin = isSchoolAdmin(effectiveRole as UserRole);
    
    // Set return state for when they navigate away from chat
    if (isAdmin) {
      console.log("ChatWithAI: User is school admin, setting state for proper navigation back to /admin");
      
      // Update location state to ensure proper return navigation
      if (!location.state?.schoolAdminReturn) {
        navigate(location.pathname, {
          state: { 
            ...location.state,
            preserveContext: true, 
            schoolAdminReturn: true,
            timestamp: Date.now()
          },
          replace: true
        });
      }
    }
  }, [user, navigate, userRole, location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update active topic and reset conversation ID to start a new one
    setActiveTopic(topic);
    setConversationId(null);
    
    // Update URL with search params
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    setSearchParams(params);
    
    toast.success("Topic updated! Starting a new conversation.");
  };

  const handleSelectConversation = (id: string) => {
    setConversationId(id);
    
    // Update URL with conversation ID
    const params = new URLSearchParams();
    params.set("conversationId", id);
    setSearchParams(params);
  };

  const handleNewConversation = () => {
    // Reset conversation and optionally clear topic
    setConversationId(null);
    
    // Update URL to remove conversation ID
    const params = new URLSearchParams();
    if (activeTopic) params.set("topic", activeTopic);
    setSearchParams(params);
  };

  const handleConversationCreated = (id: string) => {
    setConversationId(id);
    
    // Update URL with new conversation ID
    const params = new URLSearchParams();
    if (activeTopic) params.set("topic", activeTopic);
    params.set("conversationId", id);
    setSearchParams(params);
  };

  // If user is not logged in, show a loading message
  if (!user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // Determine if user is a school admin
  const fallbackRole = getUserRoleWithFallback();
  const effectiveRole = userRole || fallbackRole;
  const isAdmin = isSchoolAdmin(effectiveRole as UserRole);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Chat with AI</h1>
            <p className="text-learnable-gray">
              Get help with your studies by asking questions to our AI assistant. Attach documents to provide more context.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
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
                    <Button type="submit" className="w-full">
                      <Search className="mr-2 h-4 w-4" />
                      Start Studying
                    </Button>
                  </form>
                </CardContent>
              </Card>
              
              {/* Chat History Component */}
              <ChatHistory 
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                activeConversationId={conversationId}
              />
            </div>
            
            <div className="md:col-span-2">
              <PersistentChatInterface
                conversationId={conversationId}
                onConversationCreated={handleConversationCreated}
                topic={activeTopic}
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
