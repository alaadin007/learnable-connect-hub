import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Send, Mic, X, MessageSquare, Stop } from "lucide-react";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import VoiceRecorder from "./VoiceRecorder";
import TextToSpeech from "./TextToSpeech";
import { Message, SessionLogResult, PerformanceData } from "./types";
import { sessionLogger } from '@/utils/sessionLogger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AIChatInterfaceProps {
  conversationId?: string;
  topic?: string;
  onConversationCreated?: (id: string) => void;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ conversationId, topic: initialTopic, onConversationCreated }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(initialTopic || null);

  // Session handling
  useEffect(() => {
    if (topic && !sessionId) {
      startSession();
    }
    
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [topic]);

  const startSession = async () => {
    if (!topic) return;
    
    try {
      const result = await sessionLogger.startSessionLog(topic);
      if (result && result.id) {
        setSessionId(result.id);
      }
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    
    try {
      await sessionLogger.endSessionLog(sessionId);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  };

  // Handle conversation loading
  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
  }, [conversationId]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          role: msg.sender as "user" | "assistant" | "system",
          content: msg.content,
          timestamp: msg.timestamp
        }));
        
        setMessages(formattedMessages);
        
        // Set the topic from conversation if not provided
        if (!topic) {
          const { data: convData } = await supabase
            .from('conversations')
            .select('topic, title')
            .eq('id', conversationId)
            .single();
            
          if (convData) {
            setTopic(convData.topic || convData.title || null);
          }
        }
      }
    } catch (err) {
      console.error("Error loading conversation:", err);
      toast.error("Failed to load conversation history");
    } finally {
      setLoading(false);
    }
  };

  // Create a new conversation
  const createConversation = async (firstMessage: string) => {
    if (!user) {
      toast.error("You must be logged in to start a conversation");
      return null;
    }

    try {
      // Get school ID if not provided
      const userSchoolId = profile?.school_id || '';
      
      if (!userSchoolId) {
        toast.error("No school association found");
        return null;
      }
      
      // Create conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          school_id: userSchoolId,
          title: topic || "New conversation",
          topic: topic || null
        })
        .select('id')
        .single();

      if (conversationError) throw conversationError;

      // Save first message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationData.id,
          sender: 'user',
          content: firstMessage
        });

      if (messageError) throw messageError;

      if (onConversationCreated) {
        onConversationCreated(conversationData.id);
      }

      return conversationData.id;
    } catch (err) {
      console.error("Error creating conversation:", err);
      toast.error("Failed to save conversation");
      return null;
    }
  };

  // Save message to existing conversation
  const saveMessage = async (message: Message, conversationId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender: message.role,
          content: message.content
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error saving message:", err);
      return false;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    try {
      // Increment query count if session is active
      if (sessionId) {
        try {
          await sessionLogger.incrementQueryCount(sessionId);
        } catch (error) {
          console.error("Failed to increment query count:", error);
        }
      }

      // Prepare user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: input,
        timestamp: new Date().toISOString()
      };

      setMessages(prevMessages => [...prevMessages, userMessage]);
      setInput('');
      setIsTyping(true);

      // Save to database or create new conversation
      let currentConvId = conversationId;
      if (!currentConvId) {
        currentConvId = await createConversation(input);
      } else {
        await saveMessage(userMessage, currentConvId);
      }

      // Call the proxy function
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      const apiUrl = '/api/proxy-openai';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input, apiKey }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      if (responseData && responseData.result) {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: responseData.result,
          timestamp: new Date().toISOString()
        };

        setMessages(prevMessages => [...prevMessages, assistantMessage]);
        setLastAssistantMessage(assistantMessage.content);
        if (currentConvId) {
          await saveMessage(assistantMessage, currentConvId);
        }
      } else {
        toast.error("Failed to get response from AI.");
      }
    } catch (error) {
      console.error("Error in conversation:", error);
      setIsTyping(false);
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  const handleTranscript = (transcript: string) => {
    setInput(transcript);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            Loading...
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        {isTyping && <TypingIndicator />}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow"
            disabled={isTyping}
          />
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
            disabled={isTyping}
          >
            {showVoiceRecorder ? <X className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button 
            type="submit" 
            disabled={isTyping || !input.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
      
      {showVoiceRecorder && (
        <div className="mb-4">
          <VoiceRecorder 
            onTranscript={handleTranscript} 
            isRecording={isRecording}
            setIsRecording={setIsRecording}
          />
        </div>
      )}
      
      {textToSpeechEnabled && lastAssistantMessage && (
        <div className="mb-4">
          <TextToSpeech message={lastAssistantMessage} />
        </div>
      )}
    </div>
  );
};

export default AIChatInterface;
