
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Timer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import sessionLogger from "@/utils/sessionLogger";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface AIChatInterfaceProps {
  topic?: string;
  documentId?: string;
  initialPrompt?: string;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  topic,
  documentId,
  initialPrompt
}) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [model, setModel] = useState<string>("gpt-4o-mini");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Start a new session when the component mounts
  useEffect(() => {
    const startNewSession = async () => {
      try {
        const session = await sessionLogger.startSession(topic);
        if (session) {
          setSessionId(session);
          
          // If we have an initial prompt, add it as a system message
          if (initialPrompt) {
            setMessages([
              { role: "system", content: initialPrompt, timestamp: new Date() }
            ]);
          }
        }
      } catch (error) {
        console.error("Error starting session:", error);
      }
    };

    startNewSession();

    // End the session when the component unmounts
    return () => {
      if (sessionId) {
        sessionLogger.endSession(sessionId);
      }
    };
  }, [topic, initialPrompt]);

  // Scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!input.trim() && !initialPrompt) return;
    
    const userMessage = input.trim() || initialPrompt;
    setInput("");
    
    // Update messages with user input
    setMessages(prev => [...prev, {
      role: "user",
      content: userMessage,
      timestamp: new Date()
    }]);
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Update session topic if it's not set yet
      if (topic && sessionId) {
        await sessionLogger.updateSessionTopic(sessionId, topic);
      }
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke("ask-ai", {
        body: { 
          question: userMessage, 
          topic, 
          documentId,
          sessionId 
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Update messages with AI response
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        timestamp: new Date()
      }]);
      
      // Update model if returned
      if (data.model) {
        setModel(data.model);
      }
      
      // Increment query count
      if (sessionId) {
        await sessionLogger.incrementQueryCount(sessionId);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast.error("Failed to get a response from the AI.");
      
      // Add error message
      setMessages(prev => [...prev, {
        role: "system",
        content: "Sorry, I couldn't process your request. Please try again later.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          AI Learning Assistant
          {topic && (
            <Badge variant="outline" className="ml-2">
              Topic: {topic}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Ask questions and get help with your studies
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden pt-4">
        <ScrollArea className="h-[calc(100vh-320px)] pr-4">
          <div className="space-y-4 mb-4">
            {messages.length === 0 && !initialPrompt && (
              <div className="text-center text-muted-foreground p-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Start a conversation with the AI assistant</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  message.role === "user"
                    ? "items-end"
                    : message.role === "system"
                    ? "items-center"
                    : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : message.role === "system"
                      ? "bg-muted text-muted-foreground text-center"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div 
                    className={`text-xs mt-1 ${
                      message.role === "user" 
                        ? "text-primary-foreground/70" 
                        : message.role === "system"
                        ? "text-muted-foreground"
                        : "text-secondary-foreground/70"
                    } flex justify-end`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start">
                <div className="max-w-[85%] rounded-lg p-4 bg-muted">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <form onSubmit={handleSubmit} className="w-full space-y-2">
          <div className="w-full flex items-center space-x-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type your question here..."
              className="flex-1 resize-none min-h-[40px]"
              disabled={isLoading}
              rows={1}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || (!input.trim() && !initialPrompt)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <div className="flex items-center">
              <Timer className="h-3 w-3 mr-1" />
              {sessionId ? "Session active" : "Starting session..."}
            </div>
            <div>Model: {model}</div>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
};

export default AIChatInterface;
