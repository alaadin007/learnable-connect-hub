
import React, { useState, useEffect, useCallback, useRef } from "react";
import ChatInterface from "./ChatInterface";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { saveChatMessage, getChatHistory } from "@/utils/databaseUtils";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

const PersistentChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const { user } = useAuth();
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && !activeConversationId) {
      createNewConversation();
    }
  }, [user]);

  useEffect(() => {
    if (activeConversationId) {
      loadChatHistory();
    }
  }, [activeConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChatHistory = useCallback(async () => {
    if (!activeConversationId) return;

    try {
      setIsLoading(true);
      
      const chatHistory = await getChatHistory(activeConversationId);
      if (!chatHistory || chatHistory.length === 0) {
        setMessages([]);
        return;
      }
      
      const formattedMessages = chatHistory.map((msg: any) => ({
        id: msg.id,
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
        timestamp: msg.timestamp
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error loading chat history:", error);
      toast.error("Failed to load chat history");
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId]);

  const createNewConversation = async () => {
    try {
      if (!user) {
        toast.error("You must be logged in to create a conversation");
        return;
      }

      // Get the user's school ID
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast.error("User data not available");
        return;
      }
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', userData.user.id)
        .single();
        
      if (!profileData?.school_id) {
        toast.error("School data not available");
        return;
      }

      // Create a new conversation
      const { data: newConversation, error } = await supabase
        .from("conversations")
        .insert({
          user_id: userData.user.id,
          school_id: profileData.school_id,
          title: "New Conversation",
          topic: "general",
          starred: false,
          tags: []
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        toast.error("Failed to create new conversation");
        return;
      }

      setActiveConversationId(newConversation.id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating new conversation:", error);
      toast.error("Failed to create new conversation");
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!activeConversationId) {
      toast.error("No active conversation");
      return;
    }

    // Display user message immediately
    const userMessageObj: Message = {
      id: uuidv4(),
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    setMessages((prevMessages) => [...prevMessages, userMessageObj]);

    // Save user message to database
    const savedMessage = await saveChatMessage(
      activeConversationId,
      userMessage,
      "user",
      false
    );
    
    if (!savedMessage) {
      toast.error("Failed to save message");
      return;
    }

    // In a real app, you would send the message to an API and get a response
    // For demo purposes, we'll simulate a response
    setIsLoading(true);
    setTimeout(async () => {
      const aiResponseText = `Thanks for your message: "${userMessage}". This is a placeholder response.`;
      
      // Save AI response to database
      const savedAiMessage = await saveChatMessage(
        activeConversationId,
        aiResponseText,
        "assistant",
        false
      );
      
      if (!savedAiMessage) {
        toast.error("Failed to save AI response");
        setIsLoading(false);
        return;
      }

      // Display AI response
      const aiMessageObj: Message = {
        id: savedAiMessage.id,
        role: "assistant",
        content: aiResponseText,
        timestamp: savedAiMessage.timestamp
      };

      setMessages((prevMessages) => [...prevMessages, aiMessageObj]);
      setIsLoading(false);
    }, 1000);
  };

  // Inner component to be rendered
  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto p-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
              <p className="text-gray-600">
                Ask a question or start typing to begin
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-100 ml-auto max-w-3xl"
                    : "bg-gray-100 mr-auto max-w-3xl"
                }`}
              >
                <p>{message.content}</p>
                {message.timestamp && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
            <div ref={messageEndRef} />
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <ChatInterface
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
};

export default PersistentChatInterface;
