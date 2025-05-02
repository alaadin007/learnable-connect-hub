import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, User, Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sessionLogger } from "@/utils/sessionLogger";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  sessionId: string | undefined;
  topic: string;
  onSessionStart: (sessionId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, topic, onSessionStart }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Function to scroll to the bottom of the chat
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load existing messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    } else {
      setMessages([]); // Clear messages if no conversation is selected
    }
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize session and conversation
  useEffect(() => {
    const initializeChat = async () => {
      if (!sessionId) {
        // Start a new session and conversation
        const newSessionId = await sessionLogger.startSession(topic);
        if (newSessionId) {
          onSessionStart(newSessionId);
          const newConversationId = await createConversation(newSessionId);
          if (newConversationId) {
            setConversationId(newConversationId);
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to start a new session.",
            variant: "destructive",
          });
        }
      }
    };

    if (!sessionId) {
      initializeChat();
    }
  }, [sessionId, topic, onSessionStart, toast]);

  const createConversation = async (sessionId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ 
          user_id: user?.id, 
          session_id: sessionId,
          title: `Conversation started on ${new Date().toLocaleDateString()}`,
          topic: topic,
          last_message_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "New Conversation",
        description: "A new conversation has been started.",
      });
      return data.id;
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create a new conversation.",
        variant: "destructive",
      });
      return null;
    }
  };

  const loadMessages = async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      const formattedMessages = data.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const newMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      // Optimistic UI update
      const aiResponse = await getAIResponse(input);
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Log query count
      if (sessionId) {
        await sessionLogger.incrementQueryCount(sessionId);
      }

      // Save messages to Supabase
      await saveMessageToSupabase(newMessage, aiMessage);
      
      // Update conversation last message timestamp
      await updateConversationLastMessageTime();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
      // Revert optimistic update on failure (remove last message)
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const getAIResponse = async (message: string): Promise<string> => {
    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return `AI Response: ${message}`;
  };

  const saveMessageToSupabase = async (userMessage: ChatMessage, aiMessage: ChatMessage) => {
    try {
      // Save user message
      await supabase.from('messages').insert([
        {
          conversation_id: conversationId,
          content: userMessage.content,
          role: userMessage.role,
          created_at: userMessage.timestamp,
        },
        {
          conversation_id: conversationId,
          content: aiMessage.content,
          role: aiMessage.role,
          created_at: aiMessage.timestamp,
        },
      ]);
    } catch (error: any) {
      console.error("Error saving message to Supabase:", error);
      toast({
        title: "Error",
        description: "Failed to save message to database.",
        variant: "destructive",
      });
    }
  };

  const updateConversationLastMessageTime = async () => {
    try {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (error: any) {
      console.error("Error updating conversation last_message_at:", error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent newline in input
      sendMessage();
    }
  };

  return (
    <Card className="h-[calc(100vh-200px)] flex flex-col">
      <CardHeader>
        <CardTitle>LearnAble AI Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col space-y-4 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"
                  }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${message.role === "user"
                      ? "bg-learnable-light text-learnable-dark"
                      : "bg-learnable-blue-light text-learnable-dark"
                    }`}
                >
                  {message.content}
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  {message.role === "user" ? "You" : "LearnAble AI"} -{" "}
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="rounded-lg px-4 py-2 max-w-[80%] bg-learnable-blue-light text-learnable-dark">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <div className="w-full flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ChatInterface;
