// Add the missing onConversationCreated prop
// Only updating the Props interface, keeping the rest of the file the same
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Mic, Stop, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { VoiceRecorder } from './VoiceRecorder';
import { TextToSpeech } from './TextToSpeech';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/contexts/ThemeContext';
import sessionLogger from '@/utils/sessionLogger';

// Define conversation and message types
export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
};

// Update the Props interface to include onConversationCreated
interface Props {
  conversationId?: string;
  topic?: string;
  onConversationCreated?: (id: string) => void;
}

export function AIChatInterface({ conversationId, topic, onConversationCreated }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversation history
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    } else {
      // Start with a welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [currentConversationId]);

  // Start session logging
  useEffect(() => {
    const startSession = async () => {
      const sessionId = await sessionLogger.startSession(topic);
      setActiveSessionId(sessionId);
    };

    startSession();

    return () => {
      if (activeSessionId) {
        sessionLogger.endSession('User left chat');
      }
    };
  }, [topic]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation from database
  const loadConversation = async (id: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('timestamp', { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        const formattedMessages = data.map((msg) => ({
          id: msg.id,
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new conversation
  const createConversation = async (firstMessage: string): Promise<string> => {
    try {
      // Create conversation
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert([
          {
            user_id: user?.id,
            title: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : ''),
            topic: topic || 'General',
          },
        ])
        .select('id')
        .single();

      if (conversationError) throw conversationError;

      const newConversationId = conversationData.id;
      setCurrentConversationId(newConversationId);

      // Notify parent component about the new conversation
      if (onConversationCreated) {
        onConversationCreated(newConversationId);
      }

      return newConversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  // Save message to database
  const saveMessage = async (message: Omit<Message, 'id'>, conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            sender: message.role === 'user' ? 'user' : 'assistant',
            content: message.content,
            timestamp: message.timestamp,
          },
        ])
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Omit<Message, 'id'> = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    // Update UI immediately
    setMessages((prev) => [
      ...prev,
      { ...userMessage, id: 'temp-' + Date.now() },
    ]);
    setInput('');
    setIsTyping(true);

    try {
      // Create conversation if needed
      let msgConversationId = currentConversationId;
      if (!msgConversationId) {
        msgConversationId = await createConversation(input);
      }

      // Save user message
      const userMessageId = await saveMessage(userMessage, msgConversationId);

      // Increment query count in session log
      if (activeSessionId) {
        sessionLogger.incrementQueryCount(activeSessionId);
      }

      // Call AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationId: msgConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Create AI response message
      const aiMessage: Omit<Message, 'id'> = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      // Save AI message
      const aiMessageId = await saveMessage(aiMessage, msgConversationId);

      // Update UI with final messages
      setMessages((prev) => [
        ...prev.filter((msg) => !msg.id.startsWith('temp-')),
        { ...userMessage, id: userMessageId || 'user-' + Date.now() },
        { ...aiMessage, id: aiMessageId || 'ai-' + Date.now() },
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev.filter((msg) => !msg.id.startsWith('temp-')),
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle voice recording
  const handleVoiceInput = (transcript: string) => {
    setInput(transcript);
    if (transcript) {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[calc(100vh-12rem)] bg-background rounded-lg border">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <Separator />

      <div className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isLoading || isTyping}
          />
          <VoiceRecorder
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onTranscript={handleVoiceInput}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || isTyping}
          >
            <Send className="h-4 w-4" />
          </Button>
          <TextToSpeech messages={messages} />
        </form>
      </div>
    </div>
  );
}
