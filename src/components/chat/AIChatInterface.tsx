
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai-chat-store';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import ChatMessage from './ChatMessage';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// Simple AI chat store implementation
const useChatStore = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSubmit = async (userMessage: string) => {
    if (!userMessage.trim()) return;
    
    // Add user message
    addMessage({
      role: 'user', 
      content: userMessage
    });
    
    setIsLoading(true);
    try {
      // Simulate AI response (replace with actual AI call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add AI response
      addMessage({
        role: 'assistant',
        content: `I received your message: "${userMessage}". This is a simulated AI response.`
      });
    } catch (error) {
      console.error('Error getting AI response:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    handleSubmit
  };
};

interface AIChatInterfaceProps {
  systemPrompt?: string;
  welcomeMessage?: string;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  systemPrompt,
  welcomeMessage
}) => {
  const { messages, isLoading, handleSubmit } = useChatStore();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Add welcome message when component mounts
  useEffect(() => {
    if (welcomeMessage && messages.length === 0) {
      const welcomeMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString()
      };
      
      // Add system prompt if provided
      const initialMessages: Message[] = [];
      if (systemPrompt) {
        initialMessages.push({
          id: uuidv4(),
          role: 'system',
          content: systemPrompt,
          timestamp: new Date().toISOString()
        });
      }
      
      initialMessages.push(welcomeMsg);
    }
  }, [welcomeMessage, systemPrompt, messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      handleSubmit(input);
      setInput('');
      // Focus input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4">
        {messages.filter(msg => msg.role !== 'system').map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="text-gray-500 animate-pulse">AI is thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleFormSubmit} className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AIChatInterface;
