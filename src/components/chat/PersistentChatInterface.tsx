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

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  activeConversationId: string | null;
}

const PersistentChatInterface: React.FC = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    activeConversationId: null
  });
  
  const { user } = useAuth();
  const messageEndRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initialize conversation
  useEffect(() => {
    if (user && !state.activeConversationId) {
      createNewConversation();
    }
  }, [user, state.activeConversationId]);

  // Load chat history
  useEffect(() => {
    if (state.activeConversationId) {
      loadChatHistory();
    }
  }, [state.activeConversationId]);

  // Auto-scroll
  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const scrollToBottom = useCallback(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadChatHistory = useCallback(async () => {
    if (!state.activeConversationId) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const chatHistory = await getChatHistory(state.activeConversationId);
      
      if (!isMounted.current) return;

      if (!chatHistory || chatHistory.length === 0) {
        setState(prev => ({ ...prev, messages: [], isLoading: false }));
        return;
      }
      
      const formattedMessages = chatHistory.map((msg: any) => ({
        id: msg.id,
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
        timestamp: msg.timestamp
      }));
      
      setState(prev => ({ ...prev, messages: formattedMessages, isLoading: false }));
    } catch (error) {
      console.error("Error loading chat history:", error);
      if (isMounted.current) {
        setState(prev => ({ 
          ...prev, 
          error: "Failed to load chat history",
          isLoading: false 
        }));
        toast.error("Failed to load chat history");
      }
    }
  }, [state.activeConversationId]);

  const createNewConversation = useCallback(async () => {
    if (!user) {
      toast.error("You must be logged in to create a conversation");
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("User data not available");
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', userData.user.id)
        .single();
        
      if (profileError || !profileData?.school_id) {
        throw new Error("School data not available");
      }

      const { data: newConversation, error: conversationError } = await supabase
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

      if (conversationError || !newConversation) {
        throw new Error("Failed to create new conversation");
      }

      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          activeConversationId: newConversation.id,
          messages: [],
          isLoading: false
        }));
      }
    } catch (error) {
      console.error("Error creating new conversation:", error);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to create new conversation",
          isLoading: false
        }));
        toast.error("Failed to create new conversation");
      }
    }
  }, [user]);

  const handleSendMessage = useCallback(async (userMessage: string) => {
    if (!state.activeConversationId) {
      toast.error("No active conversation");
      return;
    }

    try {
      // Display user message immediately
      const userMessageObj: Message = {
        id: uuidv4(),
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString()
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, userMessageObj],
        isLoading: true
      }));

      // Save user message
      const savedMessage = await saveChatMessage(
        state.activeConversationId,
        userMessage,
        "user",
        false
      );
      
      if (!savedMessage) {
        throw new Error("Failed to save message");
      }

      // Simulate AI response (replace with actual API call)
      const aiResponseText = `Thanks for your message: "${userMessage}". This is a placeholder response.`;
      
      const savedAiMessage = await saveChatMessage(
        state.activeConversationId,
        aiResponseText,
        "assistant",
        false
      );
      
      if (!savedAiMessage) {
        throw new Error("Failed to save AI response");
      }

      if (isMounted.current) {
        const aiMessageObj: Message = {
          id: savedAiMessage.id,
          role: "assistant",
          content: aiResponseText,
          timestamp: savedAiMessage.timestamp
        };

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, aiMessageObj],
          isLoading: false
        }));
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : "Failed to process message",
          isLoading: false
        }));
        toast.error("Failed to process message");
      }
    }
  }, [state.activeConversationId]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto p-4">
        {state.messages.length === 0 && !state.isLoading ? (
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
            {state.messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-100 ml-auto max-w-3xl"
                    : "bg-gray-100 mr-auto max-w-3xl"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.timestamp && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
            {state.isLoading && (
              <div className="flex justify-center">
                <div className="animate-pulse">Thinking...</div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <ChatInterface
          onSendMessage={handleSendMessage}
          isLoading={state.isLoading}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
};

export default PersistentChatInterface;