import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Send,
  Loader2,
  AlertCircle,
  Paperclip,
  Mic,
  FilePlus,
  ToggleLeft,
  ToggleRight,
  Clock,
} from "lucide-react";
import TextToSpeech from "./TextToSpeech";
import VoiceRecorder from "./VoiceRecorder";
import TypingIndicator from "./TypingIndicator";
import { useSettings } from "@/contexts/SettingsContext";

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
}

interface PersistentChatInterfaceProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
  topic?: string;
}

const PersistentChatInterface: React.FC<PersistentChatInterfaceProps> = ({
  conversationId,
  onConversationCreated,
  topic = "",
}) => {
  const { user } = useAuth();
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUsingDocuments, setIsUsingDocuments] = useState<boolean>(true);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [sourceCitations, setSourceCitations] = useState<any[]>([]);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  
  // Check if API key is configured
  const isApiKeyConfigured = settings?.aiProvider === 'openai' 
    ? !!settings?.openAiKey 
    : !!settings?.geminiKey;

  // Fetch conversation history when conversationId changes
  useEffect(() => {
    if (conversationId) {
      fetchConversationHistory();
    } else {
      // Clear messages when starting a new conversation
      setMessages([]);
      setSourceCitations([]);
      setActiveDocumentId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start or end chat session based on component mount/unmount
  useEffect(() => {
    if (!user) return;

    const startChatSession = async () => {
      try {
        setIsInitialLoad(true);
        const { data, error } = await supabase.functions.invoke(
          "create-session-log",
          {
            body: { topic },
          }
        );

        if (error) {
          console.error("Error starting session:", error);
          return;
        }

        if (data?.id) {
          console.log("Chat session started with ID:", data.id);
          setSessionId(data.id);
          setIsSessionActive(true);
        }
      } catch (error) {
        console.error("Failed to start chat session:", error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    startChatSession();

    // Clean up function to end session
    return () => {
      if (sessionId) {
        endChatSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, topic]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversationHistory = async () => {
    if (!conversationId || !user) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke(
        "get-chat-history",
        {
          body: { conversationId },
        }
      );

      if (error) {
        console.error("Error fetching chat history:", error);
        toast.error("Failed to load conversation history");
        return;
      }

      if (data?.messages) {
        console.log("Loaded conversation history:", data.messages);
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error fetching conversation history:", error);
      toast.error("Failed to load conversation history");
    } finally {
      setIsLoading(false);
    }
  };

  const endChatSession = async () => {
    if (!sessionId) return;

    try {
      await supabase.functions.invoke("end-session", {
        body: { sessionId },
      });
      setSessionId(null);
      setIsSessionActive(false);
    } catch (error) {
      console.error("Failed to end chat session:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      toast.error("Please log in to use the chat");
      navigate("/login", { state: { from: "/chat" } });
      return;
    }

    if (!isApiKeyConfigured) {
      toast.error("Please configure your AI provider API key in settings");
      return;
    }

    if (!input.trim()) return;

    const userMessage = {
      id: `temp-${Date.now()}`,
      content: input,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // First save user message to the database
      const { data: savedMsg, error: saveError } = await supabase.functions.invoke(
        "save-chat-message",
        {
          body: {
            message: userMessage,
            conversationId,
            sessionId,
          },
        }
      );

      if (saveError) {
        console.error("Error saving user message:", saveError);
        toast.error("Failed to save message");
      }

      // If this is a new conversation, update with the created conversation ID
      if (!conversationId && savedMsg?.conversationId) {
        if (onConversationCreated) {
          onConversationCreated(savedMsg.conversationId);
        }
      }

      // Then send the message to the AI for processing
      const { data: aiResponse, error } = await supabase.functions.invoke("ask-ai", {
        body: {
          question: input,
          topic,
          documentId: activeDocumentId,
          useDocuments: isUsingDocuments,
          sessionId,
          conversationId: savedMsg?.conversationId || conversationId,
        },
      });

      if (error) {
        console.error("Error getting AI response:", error);
        toast.error("Failed to get response from AI");
        return;
      }

      // Save the AI's response to the database
      const aiMessage = {
        id: `ai-${Date.now()}`,
        content: aiResponse.response,
        sender: "assistant",
        timestamp: new Date().toISOString(),
      };

      const { error: saveAiError } = await supabase.functions.invoke(
        "save-chat-message",
        {
          body: {
            message: aiMessage,
            conversationId: savedMsg?.conversationId || conversationId,
            sessionId,
          },
        }
      );

      if (saveAiError) {
        console.error("Error saving AI message:", saveAiError);
      }

      // Update the messages state with the AI's response
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      
      // If there are source citations, update the state
      if (aiResponse.sourceCitations) {
        setSourceCitations(aiResponse.sourceCitations);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDocumentSelect = (documentId: string) => {
    setActiveDocumentId((prevId) => (prevId === documentId ? null : documentId));
  };

  const handleVoiceInput = (transcript: string) => {
    setInput(transcript);
    // Auto-send after voice input if option is enabled
    if (transcript) {
      setTimeout(() => handleSendMessage(), 500);
    }
  };

  const toggleUsingDocuments = () => {
    setIsUsingDocuments((prev) => !prev);
    toast.info(
      isUsingDocuments
        ? "AI will not use your documents"
        : "AI will use your documents",
      { duration: 2000 }
    );
  };

  const formatMessage = (message: Message) => {
    // Basic markdown-like formatting
    return message.content
      .split("\n")
      .map((line, i) => <p key={i} className="mb-2">{line}</p>);
  };

  const renderMessages = () => {
    if (messages.length === 0) {
      if (isInitialLoad) {
        return (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        );
      }
      return (
        <div className="text-center py-8 text-gray-500">
          <FilePlus className="h-12 w-12 mx-auto mb-2 text-blue-500 opacity-50" />
          <p className="text-lg font-medium">Start a new conversation</p>
          <p className="text-sm">
            Ask anything about your studies or upload documents for more
            personalized help.
          </p>
        </div>
      );
    }

    return messages.map((message, index) => (
      <div
        key={message.id}
        className={`mb-4 ${
          message.sender === "user" ? "text-right" : "text-left"
        }`}
      >
        <div
          className={`inline-block max-w-[85%] px-4 py-2 rounded-lg ${
            message.sender === "user"
              ? "bg-blue-100 text-blue-900"
              : "bg-gray-100 text-gray-900"
          }`}
        >
          <div className="text-sm">{formatMessage(message)}</div>
          <div
            className={`text-xs mt-1 ${
              message.sender === "user" ? "text-blue-600" : "text-gray-500"
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        {message.sender === "assistant" && settings?.showSources && sourceCitations && sourceCitations.length > 0 && (
          <div className="mt-1 ml-2 text-xs text-gray-500">
            <details>
              <summary className="cursor-pointer">Sources</summary>
              <ul className="mt-1 space-y-1 pl-3">
                {sourceCitations.map((citation, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{citation.filename}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    ));
  };

  // Check if we should display API key warning
  const showApiKeyWarning = !isSettingsLoading && !isApiKeyConfigured;

  return (
    <Card className="w-full shadow-md border-gray-200 h-[70vh] flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="gradient-text">AI Chat Assistant</CardTitle>
            <CardDescription>
              Ask questions about your studies or documents
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className={`flex items-center ${
                isUsingDocuments ? "text-blue-600" : "text-gray-500"
              }`}
              onClick={toggleUsingDocuments}
              title={isUsingDocuments ? "Documents are being used" : "Documents are not being used"}
            >
              {isUsingDocuments ? (
                <ToggleRight className="h-4 w-4 mr-1" />
              ) : (
                <ToggleLeft className="h-4 w-4 mr-1" />
              )}
              Using Documents
            </Button>
            {isSessionActive && (
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                <span>Session active</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden flex flex-col">
        <div className="flex-grow overflow-y-auto mb-4 px-2">
          {renderMessages()}
          <div ref={messagesEndRef} />
          {isLoading && (
            <div className="mt-2 text-left">
              <TypingIndicator />
            </div>
          )}
        </div>

        {showApiKeyWarning && (
          <div className="rounded-md border bg-yellow-100 p-3 py-2 mb-4 text-sm text-yellow-800 flex items-center">
            <AlertCircle className="mr-2 h-4 w-4" />
            <span className="flex-grow">
              You need to configure an AI provider API key in Settings to use the chat.
            </span>
          </div>
        )}

        <div className="relative">
          <Input
            placeholder={
              isLoading
                ? "AI is thinking..."
                : showApiKeyWarning
                ? "Configure API key in settings"
                : "Type your message..."
            }
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            disabled={isLoading || showApiKeyWarning}
            className="pr-24"
          />
          <div className="absolute right-1 top-1 flex items-center space-x-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => navigate('/documents')}
              className="h-8 w-8 rounded-full"
              title="Upload documents"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <VoiceRecorder
              onTranscriptionComplete={handleVoiceInput}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              className="h-8 w-8"
            >
              <Mic className="h-4 w-4" />
            </VoiceRecorder>
            <Button
              type="button"
              size="icon"
              className="h-8 w-8 rounded-full gradient-bg"
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading || showApiKeyWarning}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {messages.length > 0 && messages[messages.length - 1].sender === "assistant" && (
          <div className="mt-2 flex justify-end">
            <TextToSpeech 
              text={messages[messages.length - 1].content} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PersistentChatInterface;
