
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Info, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TypingIndicator from "./TypingIndicator";
import VoiceRecorder from "./VoiceRecorder";
import TextToSpeech from "./TextToSpeech";
import { sessionLogger } from "@/utils/sessionLogger";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface AIChatInterfaceProps {
  initialContext?: string;
  placeholder?: string;
  initialTopic?: string;
  enableLongTermMemory?: boolean;
  autoSaveHistory?: boolean;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  initialContext = "",
  placeholder = "Type your question here...",
  initialTopic = "General Study Help",
  enableLongTermMemory = false,
  autoSaveHistory = false,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [topic, setTopic] = useState(initialTopic);
  const [showTips, setShowTips] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Start session on component mount
  useEffect(() => {
    const startSession = async () => {
      // Only start a session if the user is logged in
      if (!user) return;
      
      try {
        const logId = await sessionLogger.startSession({ topic });
        if (logId) {
          console.log("Started session with ID:", logId);
          setSessionId(logId);
        }
      } catch (error) {
        console.error("Failed to start session:", error);
      }
    };
    
    startSession();
    
    // End session on component unmount
    return () => {
      if (sessionId) {
        sessionLogger.endSession()
          .then(success => {
            if (success) {
              console.log("Ended session successfully");
            }
          })
          .catch(error => {
            console.error("Failed to end session:", error);
          });
      }
    };
  }, [user, topic]);

  // Update topic in session logger if topic changes
  useEffect(() => {
    if (topic && sessionId && sessionLogger.isSessionActive()) {
      sessionLogger.updateTopic(topic);
    }
  }, [topic, sessionId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on initial load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setInput("");
    
    // Generate unique IDs for messages
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    
    // Add user message to state
    setMessages(prevMessages => [
      ...prevMessages, 
      { id: userMessageId, role: "user", content: userMessage }
    ]);
    
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      // Log query in session
      if (sessionId) {
        sessionLogger.logQuery();
      }

      // Call the Edge Function to get AI response
      const { data, error } = await supabase.functions.invoke("ask-ai", {
        body: {
          question: userMessage,
          sessionId,
          context: initialContext,
          topic
        }
      });

      if (error) {
        throw new Error(`Error from Edge Function: ${error.message}`);
      }

      // Add assistant message to state
      const aiResponse = data.answer || "Sorry, I couldn't generate a response.";
      setMessages(prevMessages => [
        ...prevMessages,
        { id: assistantMessageId, role: "assistant", content: aiResponse }
      ]);

      // Save to conversation history if enabled
      if (autoSaveHistory) {
        try {
          await supabase.functions.invoke("save-chat-message", {
            body: {
              conversationId: sessionId || undefined,
              sender: "user",
              content: userMessage,
              topic,
            }
          });
          
          await supabase.functions.invoke("save-chat-message", {
            body: {
              conversationId: sessionId || undefined,
              sender: "assistant",
              content: aiResponse,
              topic,
            }
          });
        } catch (saveError) {
          console.error("Failed to save messages to history:", saveError);
          // Continue even if saving fails
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to get response. Please try again.");
      
      // Add error message to state
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          id: assistantMessageId, 
          role: "assistant", 
          content: "Sorry, I encountered an error processing your request. Please try again." 
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [input, initialContext, sessionId, topic, autoSaveHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleVoiceInput = (transcript: string) => {
    setInput(prevInput => prevInput + " " + transcript);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleTips = () => {
    setShowTips(!showTips);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-md overflow-hidden border shadow-sm">
      {/* Chat header */}
      <div className="p-3 bg-learnable-super-light border-b flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-gray-800">AI Learning Assistant</h3>
          <div className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">
            {topic}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700"
          onClick={toggleTips}
        >
          {showTips ? <X size={16} /> : <Info size={16} />}
        </Button>
      </div>

      {/* Tips section */}
      {showTips && (
        <div className="p-3 bg-blue-50 border-b">
          <h4 className="font-medium text-blue-800 mb-1">Tips for better results:</h4>
          <ul className="text-sm text-blue-700 space-y-1 pl-4 list-disc">
            <li>Be specific with your questions</li>
            <li>Provide context about what you're studying</li>
            <li>Ask follow-up questions to go deeper</li>
            <li>Request examples if something is unclear</li>
          </ul>
        </div>
      )}

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-12">
            <p className="mb-2">👋 Hi there! How can I help you learn today?</p>
            <p className="text-sm">Ask me anything about your studies.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3/4 rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="prose prose-sm">
                  {message.content.split("\n").map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < message.content.split("\n").length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
                {message.role === "assistant" && (
                  <div className="mt-2 flex justify-end">
                    <TextToSpeech text={message.content} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-3 bg-gray-50">
        <div className="flex space-x-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <div className="flex flex-col space-y-2">
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <VoiceRecorder onTranscription={handleVoiceInput} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;
