import React, { useState, useEffect, useCallback } from 'react';
import { useCompletion } from 'ai/react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Send } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"
import { ChatMessage } from './ChatMessage';
import { useAuth } from '@/contexts/AuthContext';
import sessionLogger from '@/utils/sessionLogger';

// Add the missing prop types
export interface AIChatInterfaceProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
  topic?: string;
}

// Update the component definition to accept the correct props
const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  conversationId,
  onConversationCreated,
  topic
}) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'system', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(conversationId || null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    completion,
    input: hookInput,
    setInput: hookSetInput,
    handleInputChange,
    handleSubmit: hookHandleSubmit,
    isLoading: hookIsLoading,
  } = useCompletion({
    api: '/api/completion',
    // initialInput: "You are a helpful AI assistant. Format your responses using markdown.",
    onFinish: (completion) => {
      // This function is called when the API request is complete.
      console.log('Completion finished', completion);
    },
    onError: (error) => {
      // This function is called when the API request fails.
      console.error('Completion error', error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem with the AI completion. Please try again.",
      })
    },
  });

  // Initialize the hook input with the system prompt
  useEffect(() => {
    hookSetInput("You are a helpful AI assistant. Format your responses using markdown.");
  }, [hookSetInput]);

  // Update the session logging methods to use the correct names
  useEffect(() => {
    if (!currentSessionId && !isLoadingSession) {
      // Start a new session log when the component mounts
      const startSession = async () => {
        setIsLoadingSession(true);
        try {
          const result = await sessionLogger.startSessionLog(topic || "General Chat");
          if (result.success && result.sessionId) {
            setCurrentSessionId(result.sessionId);
            console.log("Session started with ID:", result.sessionId);
            if (onConversationCreated) {
              onConversationCreated(result.sessionId);
            }
          } else {
            console.error("Failed to start session:", result.message);
          }
        } catch (error) {
          console.error("Error starting session:", error);
        } finally {
          setIsLoadingSession(false);
        }
      };
      startSession();
    }
    
    return () => {
      // End the session log when the component unmounts
      if (currentSessionId) {
        const endCurrentSession = async () => {
          try {
            await sessionLogger.endSessionLog(currentSessionId, {
              queries: messages.filter(m => m.role === 'user').length,
            });
            console.log("Session ended:", currentSessionId);
          } catch (error) {
            console.error("Error ending session:", error);
          }
        };
        endCurrentSession();
      }
    };
  }, [currentSessionId, isLoadingSession, topic, messages, onConversationCreated]);

  // Update topic when it changes
  useEffect(() => {
    if (currentSessionId && topic) {
      const updateSession = async () => {
        try {
          await sessionLogger.updateSessionTopic(currentSessionId, topic);
          console.log("Session topic updated:", topic);
        } catch (error) {
          console.error("Error updating session topic:", error);
        }
      };
      updateSession();
    }
  }, [currentSessionId, topic]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!input) return;

      setMessages((prevMessages) => [...prevMessages, { role: 'user', content: input }]);

      hookHandleSubmit(e);

      setInput('');
    },
    [hookHandleSubmit, input]
  );

  useEffect(() => {
    if (completion) {
      setMessages((prevMessages) => [...prevMessages, { role: 'assistant', content: completion }]);
    }
  }, [completion]);

  // In the sendMessage function, update the query logging
  const sendMessage = async (userMessage: string) => {
    if (!userMessage) return;

    setMessages((prevMessages) => [...prevMessages, { role: 'user', content: userMessage }]);

    hookSetInput((prevInput) => prevInput + `\nUser: ${userMessage}`);

    setInput('');

    // Log the query in the session
    if (currentSessionId) {
      try {
        // Since there's no direct incrementQueryCount method, we'll update the session with the current topic
        // which should register activity in the session
        await sessionLogger.updateSessionTopic(currentSessionId, topic || "General Chat");
      } catch (error) {
        console.error("Error logging query:", error);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-grow">
        <CardContent className="overflow-y-auto h-full">
          <div className="flex flex-col space-y-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {hookIsLoading && (
              <ChatMessage message={{ role: 'assistant', content: 'Thinking...' }} />
            )}
          </div>
        </CardContent>
      </Card>
      <div className="mt-4">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow"
          />
          <Button type="submit" disabled={hookIsLoading}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AIChatInterface;
