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
import { ConversationList } from "@/components/chat/ConversationList";
import sessionLogger from "@/utils/sessionLogger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState<string>("");
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
    
    // Update session topic if we have an active session
    if (sessionId && sessionLogger.hasActiveSession()) {
      sessionLogger.updateSessionTopic(sessionId, topic).catch(err => {
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
    
    // Get the selected conversation
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      // Update the UI with the conversation's metadata
      setTopic(conversation.topic || "");
      setCategoryInput(conversation.category || "");
      setTagsInput((conversation.tags || []).join(", "));
    }
  };

  const startNewConversation = () => {
    setSelectedConversationId(null);
    setCategoryInput("");
    setTagsInput("");
    setTopic("");
  };
  
  const updateConversationMetadata = async () => {
    if (!selectedConversationId) return;
    
    try {
      // Convert tags input to array
      const tagsArray = tagsInput
        ? tagsInput.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];
      
      const { error } = await supabase
        .from('conversations')
        .update({ 
          category: categoryInput.trim() || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          topic: topic || null
        })
        .eq('id', selectedConversationId);
      
      if (error) throw error;
      
      // Update local state
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === selectedConversationId 
            ? { 
                ...conv, 
                category: categoryInput.trim() || null,
                tags: tagsArray.length > 0 ? tagsArray : null,
                topic: topic || null
              } 
            : conv
        )
      );
      
      toast({
        title: "Updated",
        description: "Conversation details have been updated.",
      });
    } catch (error: any) {
      console.error("Error updating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to update conversation details.",
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
      
      toast({
        title: newStarredState ? "Starred" : "Unstarred",
        description: `Conversation has been ${newStarredState ? "starred" : "unstarred"}.`,
      });
    } catch (error: any) {
      console.error("Error toggling star:", error);
      toast({
        title: "Error",
        description: "Failed to update conversation.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteConversation = (conversationId: string) => {
    setDeletingConversationId(conversationId);
  };
  
  const deleteConversation = async () => {
    if (!deletingConversationId) return;
    
    try {
      // First delete all messages in the conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', deletingConversationId);
      
      if (messagesError) throw messagesError;
      
      // Then delete the conversation itself
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', deletingConversationId);
      
      if (conversationError) throw conversationError;
      
      // Update local state
      setConversations(prevConversations => 
        prevConversations.filter(conv => conv.id !== deletingConversationId)
      );
      
      // If the deleted conversation was selected, clear selection
      if (selectedConversationId === deletingConversationId) {
        setSelectedConversationId(null);
        setCategoryInput("");
        setTagsInput("");
        setTopic("");
      }
      
      toast({
        title: "Deleted",
        description: "Conversation has been deleted.",
      });
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversation.",
        variant: "destructive",
      });
    } finally {
      setDeletingConversationId(null);
    }
  };
  
  const cancelDelete = () => {
    setDeletingConversationId(null);
  };
  
  const generateSummary = async (conversationId: string) => {
    try {
      setGeneratingSummary(true);
      
      // Call the Edge Function to generate a summary
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: { conversation_id: conversationId }
      });
      
      if (error) throw error;
      
      if (data && data.success) {
        // Update local state with the new summary
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === conversationId 
              ? { 
                  ...conv, 
                  summary: data.summary,
                  tags: data.tags || conv.tags,
                  category: data.category || conv.category
                } 
              : conv
          )
        );
        
        // If this is the currently selected conversation, update the inputs
        if (selectedConversationId === conversationId) {
          setCategoryInput(data.category || categoryInput);
          setTagsInput((data.tags || []).join(", ") || tagsInput);
        }
        
        toast({
          title: "Summary Generated",
          description: "Conversation summary has been updated.",
        });
      }
    } catch (error: any) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate summary.",
        variant: "destructive",
      });
    } finally {
      setGeneratingSummary(false);
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
                onToggleStar={toggleStarConversation}
                onDeleteConversation={confirmDeleteConversation}
                onGenerateSummary={generateSummary}
              />
              
              {selectedConversationId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Conversation Details</CardTitle>
                    <CardDescription>Edit metadata for this conversation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input 
                        id="category" 
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value)}
                        placeholder="E.g. Homework, Research, Exam Prep..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input 
                        id="tags" 
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="E.g. math, algebra, homework..."
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="default" 
                        onClick={updateConversationMetadata}
                        className="flex-1"
                      >
                        Save Changes
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => generateSummary(selectedConversationId)}
                        disabled={generatingSummary}
                        className="flex-1"
                      >
                        {generatingSummary ? "Processing..." : "Auto-Generate"}
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
      
      <AlertDialog open={!!deletingConversationId} onOpenChange={cancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all of its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteConversation} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatWithAI;
