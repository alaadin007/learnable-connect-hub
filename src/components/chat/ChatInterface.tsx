
import React, { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, BookOpen, Archive, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  sourceCitations?: SourceCitation[];
}

interface SourceCitation {
  filename: string;
  document_id: string;
}

interface ChatInterfaceProps {
  sessionId?: string;
  topic?: string;
  onSessionStart?: (sessionId: string) => void;
}

const ChatInterface = ({ sessionId, topic, onSessionStart }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [useDocuments, setUseDocuments] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation if conversationId changes or on component mount
  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Load messages for a specific conversation
  const loadConversationMessages = async (conversationId: string) => {
    if (!conversationId) return;
    
    setIsLoadingHistory(true);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      // Transform to our Message format
      if (data) {
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.sender === 'user',
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error: any) {
      console.error("Error loading conversation messages:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation history.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    try {
      // Call the ask-ai edge function
      const { data, error } = await supabase.functions.invoke("ask-ai", {
        body: {
          question: userMessage.content,
          conversationId: currentConversationId,
          sessionId: sessionId,
          topic: topic,
          useDocuments: useDocuments
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Add AI response to messages
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: data.response,
        isUser: false,
        timestamp: new Date(),
      };
      
      // Add source citations if present
      if (data.sourceCitations && data.sourceCitations.length > 0) {
        aiMessage.sourceCitations = data.sourceCitations;
      }
      
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      
      // If this is a new conversation, save the conversation ID
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }
      
      // Handle session ID if provided by the callback
      if (onSessionStart && data.sessionId && !sessionId) {
        onSessionStart(data.sessionId);
      }
    } catch (error: any) {
      console.error("Error calling ask-ai function:", error);
      toast({
        title: "Error",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Start a new conversation
  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Chat with LearnAble AI</CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="use-documents" 
                      checked={useDocuments} 
                      onCheckedChange={setUseDocuments}
                    />
                    <Label htmlFor="use-documents" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>Use Documents</span>
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  When enabled, the AI will reference your uploaded documents to answer questions
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {currentConversationId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startNewConversation}
            >
              New Conversation
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow overflow-y-auto p-4">
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Ask a question to start chatting with LearnAble AI
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.isUser
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Source Citations */}
                    {!message.isUser && message.sourceCitations && message.sourceCitations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium flex items-center gap-1 mb-1 text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          <span>Sources:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {message.sourceCitations.map((citation, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="text-xs flex items-center gap-1"
                            >
                              <Archive className="h-3 w-3" />
                              {citation.filename}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div
                      className={`text-xs mt-1 ${
                        message.isUser ? "text-blue-100" : "text-muted-foreground"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <div className="flex w-full items-center space-x-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question here..."
            className="flex-grow"
            disabled={isLoading || isLoadingHistory}
          />
          <Button onClick={handleSend} disabled={isLoading || isLoadingHistory || !inputValue.trim()}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ChatInterface;
