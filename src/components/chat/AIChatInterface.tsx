
// Update the import to fix the error with missing module
import React, { useState, useEffect } from 'react';
import { Message } from './types';
// Remove the missing import and use local state instead
// import { useChatStore } from 'ai-chat-store';
import ChatMessage from './ChatMessage';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Send } from 'lucide-react';
import { Card } from '../ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AIChatInterfaceProps {
  title?: string;
  subheading?: string;
  initialPrompt?: string;
  persistHistory?: boolean;
  conversationId?: string;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  title = "AI Assistant",
  subheading = "Ask me anything",
  initialPrompt,
  persistHistory = false,
  conversationId
}) => {
  // Use local state instead of the store
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (initialPrompt) {
      sendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Call AI assistant API
      const response = await supabase.functions.invoke('ask-ai', {
        body: { 
          message: content,
          conversation_id: conversationId,
          persist: persistHistory
        }
      });
      
      if (response.error) throw new Error(response.error.message);
      
      const assistantMessage: Message = {
        id: response.data?.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data?.content || "I'm sorry, I couldn't process your request.",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, an error occurred while processing your request.",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && inputValue.trim()) {
      sendMessage(inputValue);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="bg-primary/5 p-4 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{subheading}</p>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-pulse">Thinking...</div>
          </div>
        )}
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Start a conversation by typing a message below.
          </div>
        )}
      </div>
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default AIChatInterface;
