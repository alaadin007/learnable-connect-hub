// Add support for onConversationCreated prop in AIChatInterface component
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import VoiceRecorder from './VoiceRecorder';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
  topic?: string;
}

const AIChatInterface: React.FC<Props> = ({ 
  conversationId, 
  onConversationCreated,
  topic 
}) => {
  const { user, profile, schoolId } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(conversationId);
  const [sessionLogId, setSessionLogId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing conversation if ID is provided
  useEffect(() => {
    if (activeConversationId) {
      loadConversation(activeConversationId);
    } else if (topic) {
      // If topic is provided but no conversation, create a welcome message
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          content: `Hello! I'm here to help you with ${topic}. What would you like to know?`,
          timestamp: new Date().toISOString()
        }
      ]);
    } else {
      // Default welcome message
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          content: "Hello! I'm your AI learning assistant. How can I help you today?",
          timestamp: new Date().toISOString()
        }
      ]);
    }

    // Create a session log when component mounts
    createSessionLog();

    return () => {
      // End the session log when component unmounts
      if (sessionLogId) {
        endSessionLog();
      }
    };
  }, [activeConversationId, topic]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createSessionLog = async () => {
    try {
      const { data, error } = await supabase.rpc('create_session_log', {
        topic: topic || null
      });

      if (error) {
        console.error('Error creating session log:', error);
        return;
      }

      setSessionLogId(data);
    } catch (error) {
      console.error('Error in createSessionLog:', error);
    }
  };

  const endSessionLog = async () => {
    if (!sessionLogId) return;

    try {
      await supabase.rpc('end_session_log', {
        log_id: sessionLogId,
        performance_data: null
      });
    } catch (error) {
      console.error('Error ending session log:', error);
    }
  };

  const incrementQueryCount = async () => {
    if (!sessionLogId) return;

    try {
      await supabase.rpc('increment_session_query_count', {
        log_id: sessionLogId
      });
    } catch (error) {
      console.error('Error incrementing query count:', error);
    }
  };

  const updateSessionTopic = async (newTopic: string) => {
    if (!sessionLogId) return;

    try {
      await supabase.rpc('update_session_topic', {
        log_id: sessionLogId,
        topic: newTopic
      });
    } catch (error) {
      console.error('Error updating session topic:', error);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      // First, check if the conversation exists and belongs to the user
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (conversationError || !conversationData) {
        console.error('Error loading conversation:', conversationError);
        toast.error('Could not load conversation');
        return;
      }

      // If topic is available, update the session log
      if (conversationData.topic) {
        updateSessionTopic(conversationData.topic);
      }

      // Then load the messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('timestamp', { ascending: true });

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        toast.error('Could not load messages');
        return;
      }

      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error in loadConversation:', error);
      toast.error('Failed to load conversation');
    }
  };

  const createNewConversation = async (firstMessage: string): Promise<string> => {
    try {
      if (!user?.id || !schoolId) {
        throw new Error('User not authenticated or school not found');
      }

      // Create a new conversation
      const conversationId = uuidv4();
      const { error: conversationError } = await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          user_id: user.id,
          school_id: schoolId,
          title: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : ''),
          topic: topic || null,
          last_message_at: new Date().toISOString()
        });

      if (conversationError) {
        throw conversationError;
      }

      // Call the callback if provided
      if (onConversationCreated) {
        onConversationCreated(conversationId);
      }

      return conversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const saveMessage = async (message: any, conversationId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          ...message,
          conversation_id: conversationId
        });

      if (error) {
        console.error('Error saving message:', error);
      }
    } catch (error) {
      console.error('Error in saveMessage:', error);
    }
  };

  const handleSendMessage = async (messageText: string = input) => {
    if (!messageText.trim()) return;
    
    try {
      setIsLoading(true);
      
      // Create a user message object
      const userMessage = {
        id: uuidv4(),
        sender: 'user',
        content: messageText,
        timestamp: new Date().toISOString()
      };
      
      // Add user message to UI immediately
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      
      // Focus the textarea after sending
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      
      // Create or use conversation ID
      let currentConversationId = activeConversationId;
      
      if (!currentConversationId) {
        currentConversationId = await createNewConversation(messageText);
        setActiveConversationId(currentConversationId);
      }
      
      // Save user message to database
      await saveMessage(userMessage, currentConversationId);
      
      // Increment the query count for analytics
      await incrementQueryCount();
      
      // Create a temporary thinking message
      const thinkingId = uuidv4();
      setMessages(prev => [...prev, {
        id: thinkingId,
        sender: 'assistant',
        content: '...',
        isThinking: true,
        timestamp: new Date().toISOString()
      }]);
      
      // Call AI service
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          conversationId: currentConversationId,
          topic: topic || null
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Remove thinking message and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingId);
        return [...filtered, {
          id: uuidv4(),
          sender: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        }];
      });
      
      // Save AI response to database
      await saveMessage({
        id: uuidv4(),
        sender: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      }, currentConversationId);
      
      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', currentConversationId);
        
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove thinking message if there was an error
      setMessages(prev => prev.filter(m => !m.isThinking));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-3 rounded-lg p-4",
                message.sender === 'assistant' 
                  ? "bg-muted/50" 
                  : "bg-background border"
              )}
            >
              <Avatar className={cn(
                "h-8 w-8",
                message.sender === 'assistant' && "bg-primary text-primary-foreground"
              )}>
                {message.sender === 'assistant' ? (
                  <>
                    <AvatarImage src="/ai-avatar.png" alt="AI" />
                    <AvatarFallback><Sparkles className="h-4 w-4" /></AvatarFallback>
                  </>
                ) : (
                  <>
                    <AvatarImage src={user?.user_metadata?.avatar_url || ''} alt={profile?.full_name || 'User'} />
                    <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
                  </>
                )}
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">
                    {message.sender === 'assistant' ? 'AI Assistant' : profile?.full_name || 'You'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className={cn(
                  "prose prose-sm max-w-none",
                  theme === 'dark' && "prose-invert"
                )}>
                  {message.isThinking ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }} />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-10 flex-1 resize-none"
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <VoiceRecorder 
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
            />
            <Button 
              size="icon" 
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim()}
              className="rounded-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;
