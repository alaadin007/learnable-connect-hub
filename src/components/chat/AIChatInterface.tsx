import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, PauseCircle, Trash2, Mic, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createSessionLog, incrementSessionQueryCount, endSession, updateSessionTopic } from '@/utils/sessionLogger';
import { VoiceRecorder } from './VoiceRecorder';
import { TextToSpeech } from './TextToSpeech';

interface AIChatInterfaceProps {
  conversationId?: string;
  topic?: string | null;
  onConversationCreated: (id: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ conversationId: initialConversationId, topic: initialTopic, onConversationCreated }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(initialTopic || '');
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [isRecording, setIsRecording] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Load existing messages when conversationId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId) return;

      try {
        const response = await fetch(`/api/chat/getMessages?conversationId=${conversationId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status}`);
        }
        const data = await response.json();

        // Map the data to the Message interface
        const formattedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "Failed to load previous messages.",
        });
      }
    };

    loadMessages();
  }, [conversationId, toast]);

  // Initialize session and conversation on component mount
  useEffect(() => {
    const initializeSession = async () => {
      if (!user || !profile) return;

      try {
        // If a conversation ID already exists, use it; otherwise, create a new session and conversation
        if (conversationId) {
          console.log(`Resuming existing conversation with ID: ${conversationId}`);
          return;
        }

        // Start a new session and get the session ID
        const newSessionId = await createSessionLog(topic || "General Chat");
        if (newSessionId) {
          setSessionId(newSessionId);

          // Create a new conversation
          const response = await fetch('/api/chat/createConversation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              schoolId: profile.school_id,
              topic: topic || "General Chat",
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create conversation: ${response.status}`);
          }

          const data = await response.json();
          const newConversationId = data.conversationId;
          setConversationId(newConversationId);
          onConversationCreated(newConversationId); // Notify the parent component

          toast({
            title: "New conversation started!",
            description: "Start chatting to see the magic happen.",
          });
        } else {
          throw new Error("Failed to start a new session.");
        }
      } catch (error) {
        console.error("Error initializing session:", error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "Failed to initialize the chat session.",
        });
      }
    };

    initializeSession();
  }, [user, profile, topic, onConversationCreated, conversationId, toast]);

  // Update the session topic whenever the topic changes
  useEffect(() => {
    const updateTopic = async () => {
      if (sessionId && topic) {
        const success = await updateSessionTopic(sessionId, topic);
        if (!success) {
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Failed to update the session topic.",
          });
        }
      }
    };

    updateTopic();
  }, [sessionId, topic, toast]);

  // Function to send a message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isThinking || !user || !profile || !conversationId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInput('');
    setIsThinking(true);

    try {
      // Increment query count
      if (sessionId) {
        await incrementSessionQueryCount(sessionId);
      }

      // Send message to the API
      const response = await fetch('/api/chat/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationId: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Failed to send the message.",
      });
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking, user, profile, conversationId, sessionId, toast]);

  // Function to handle voice transcript
  const handleVoiceTranscript = (transcript: string) => {
    setInput(transcript);
  };

  // Function to clear the conversation
  const clearConversation = async () => {
    if (!conversationId) return;

    try {
      const response = await fetch('/api/chat/clearConversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId: conversationId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to clear conversation: ${response.status}`);
      }

      setMessages([]);
      toast({
        title: "Conversation cleared!",
        description: "All messages have been removed.",
      });
    } catch (error) {
      console.error("Error clearing conversation:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Failed to clear the conversation.",
      });
    }
  };

  // Function to end the session
  const handleEndSession = async () => {
    if (!sessionId) return;

    try {
      const success = await endSession(sessionId);
      if (success) {
        toast({
          title: "Session ended!",
          description: "Your session has been successfully ended.",
        });
      } else {
        throw new Error("Failed to end the session.");
      }
    } catch (error) {
      console.error("Error ending session:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Failed to end the session.",
      });
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Enter key press to send message
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-grow">
        <Card className="h-full flex flex-col">
          <CardContent className="h-full flex flex-col p-4">
            <ScrollArea className="flex-grow">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col text-sm ${message.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 inline-block ${message.sender === 'user'
                        ? 'bg-learnable-light text-right'
                        : 'bg-gray-100 text-left'
                        }`}
                    >
                      {message.content}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                <div ref={chatBottomRef} /> {/* Scroll anchor */}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Input and Controls */}
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            className="flex-grow"
          />
          <VoiceRecorder onTranscript={handleVoiceTranscript} isRecording={isRecording} setIsRecording={setIsRecording} />
          <Button onClick={sendMessage} disabled={isThinking}>
            {isThinking ? <PauseCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex justify-between items-center mt-2">
          <Button variant="ghost" onClick={clearConversation} disabled={isThinking}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Conversation
          </Button>
          <TextToSpeech message={messages.length > 0 ? messages[messages.length - 1].content : ''} />
          <Button variant="secondary" onClick={handleEndSession} disabled={isThinking}>
            End Session
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;
