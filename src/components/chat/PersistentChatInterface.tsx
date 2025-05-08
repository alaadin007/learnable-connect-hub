import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, MessageCircle, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Badge } from '@/components/ui/badge';
import sessionLogger from '@/utils/sessionLogger';
import VoiceRecorder from './VoiceRecorder';
import TextToSpeech from './TextToSpeech';
import { saveChatMessage, getChatHistory } from '@/utils/databaseUtils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface PersistentChatInterfaceProps {
  conversationId?: string | null;
  onConversationCreated?: (id: string) => void;
  topic?: string;
}

const PersistentChatInterface: React.FC<PersistentChatInterfaceProps> = ({
  conversationId,
  onConversationCreated,
  topic,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loadingHistory, setLoadingHistory] = useState(!!conversationId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start session on component mount
  useEffect(() => {
    const startNewSession = async () => {
      try {
        const newSessionId = await sessionLogger.startSession(topic);
        if (newSessionId) {
          setSessionId(newSessionId);
        }
      } catch (error) {
        console.error("Error starting session:", error);
      }
    };

    startNewSession();

    return () => {
      if (sessionId) {
        sessionLogger.endSession(sessionId);
      }
    };
  }, [topic]);

  // Load conversation history when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadChatHistory(conversationId);
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async (convoId: string) => {
    setLoadingHistory(true);
    try {
      const data = await getChatHistory(convoId);
      if (data?.messages) {
        const chatMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.timestamp
        }));
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      toast.error("Failed to load chat history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    const messageId = uuidv4();
    const userMessage = {
      id: messageId,
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    try {
      const saveResult = await saveChatMessage(userMessage, conversationId, sessionId);
      if (saveResult.success) {
        if (saveResult.conversationId && !conversationId && onConversationCreated) {
          onConversationCreated(saveResult.conversationId);
        }
        // TODO: Integrate AI response here (call your backend or OpenAI API directly)
      }
    } catch (error: any) {
      console.error("Error in chat:", error);
      toast.error("There was an error processing your message");
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          role: 'system',
          content: "Sorry, there was an error processing your request. Please try again.",
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || isLoading) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Please upload a file smaller than 10MB");
      return;
    }
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(fileExt || '')) {
      toast.error("Unsupported file type. Please upload a PDF, JPG or PNG file");
      return;
    }
    setIsLoading(true);
    try {
      const filePath = `${user?.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = await supabase.storage
        .from('user-content')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      const fileMessage = {
        id: uuidv4(),
        role: 'user' as const,
        content: `📎 [${file.name}](${publicUrl})`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, fileMessage]);
      const saveResult = await saveChatMessage(fileMessage, conversationId, sessionId);
      if (saveResult.success) {
        if (saveResult.conversationId && !conversationId && onConversationCreated) {
          onConversationCreated(saveResult.conversationId);
        }
      }
      toast.success(`File ${file.name} uploaded successfully`);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsLoading(false);
      if (event.target) event.target.value = '';
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTranscriptionComplete = (text: string) => {
    setInput(text);
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle className="text-xl flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          AI Learning Assistant
          {topic && (
            <Badge variant="outline" className="ml-2">
              Topic: {topic}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden pt-4">
        <ScrollArea className="h-[calc(100vh-320px)] pr-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading chat history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Start a conversation with the AI assistant</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.role === "user"
                      ? "items-end"
                      : message.role === "system"
                      ? "items-center"
                      : "items-start"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : message.role === "system"
                          ? "bg-muted text-muted-foreground text-center"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div 
                        className={`text-xs mt-1 ${
                          message.role === "user" 
                            ? "text-primary-foreground/70" 
                            : message.role === "system"
                            ? "text-muted-foreground"
                            : "text-secondary-foreground/70"
                        } flex justify-end`}
                      >
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                    
                    {message.role === "assistant" && (
                      <TextToSpeech text={message.content} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {isLoading && (
            <div className="flex items-start mt-4">
              <div className="max-w-[85%] rounded-lg p-4 bg-secondary">
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="w-full flex items-center space-x-2">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || loadingHistory}
              className="pr-10"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0"
              onClick={handleFileUpload}
              disabled={isLoading || loadingHistory}
            >
              <Paperclip className="h-4 w-4 text-gray-500" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>
          <VoiceRecorder onTranscriptionComplete={handleTranscriptionComplete} />
          <Button onClick={handleSubmit} disabled={isLoading || !input.trim() || loadingHistory}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default PersistentChatInterface;
