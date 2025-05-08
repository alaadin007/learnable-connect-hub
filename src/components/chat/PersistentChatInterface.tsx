
import React, { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Message } from "@/components/chat/types"
import VoiceRecorder from "@/components/chat/VoiceRecorder"

interface Props {
  conversationId?: string;
  existingMessages?: any[];
}

const PersistentChatInterface: React.FC<Props> = ({ conversationId, existingMessages }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useSupabaseClient();
  const { user } = useAuth();

  useEffect(() => {
    if (existingMessages?.length > 0) {
      // Map existing messages to the correct format and ensure role is a valid enum value
      const formattedMessages: Message[] = existingMessages.map(msg => ({
        id: msg.id,
        role: (msg.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp
      }));
      setMessages(formattedMessages);
    }
  }, [existingMessages]);

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    setIsLoading(true);
    const tempMessageId = uuidv4();

    // Optimistically update the local state
    const userMessageObject: Message = {
      id: tempMessageId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prevMessages => [...prevMessages, userMessageObject]);
    setNewMessage('');

    try {
      if (!conversationId) {
        throw new Error("Conversation ID is missing.");
      }

      // Send the message to the database
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: userMessage,
          sender: 'user',
          timestamp: new Date().toISOString(),
          user_id: user?.id,
        });

      if (error) {
        console.error("Error sending message:", error);
        // Revert the optimistic update on error
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempMessageId));
      } else {
        // Fetch the AI response
        const aiResponse = await getAIResponse(userMessage);

        // Add the AI response to the local state
        const aiMessageObject: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
        };
        setMessages(prevMessages => [...prevMessages, aiMessageObject]);

        // Send the AI response to the database
        const { error: aiError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            content: aiResponse,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          });

        if (aiError) {
          console.error("Error sending AI message:", aiError);
        }
      }
    } catch (error: any) {
      console.error("Error in handleSendMessage:", error);
      // Revert the optimistic update on error
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const getAIResponse = async (userMessage: string): Promise<string> => {
    // Mock AI response for now
    await new Promise(resolve => setTimeout(resolve, 500));
    return `AI Response: ${userMessage}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-2 p-2 rounded-md ${message.role === 'user' ? 'bg-blue-100 text-right ml-auto' : 'bg-gray-100 text-left mr-auto'}`}
            style={{ maxWidth: '80%' }}
          >
            <div className="text-sm text-gray-600">{message.role}</div>
            <div>{message.content}</div>
            <div className="text-xs text-gray-500">{message.timestamp}</div>
          </div>
        ))}
        {isLoading && <div className="text-gray-500">Loading...</div>}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Enter your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage(newMessage);
                setNewMessage('');
              }
            }}
          />
          <Button onClick={() => {
            handleSendMessage(newMessage);
            setNewMessage('');
          }} disabled={isLoading}>
            Send
          </Button>
        </div>
        <VoiceRecorder 
          onSendMessage={(userMessage: string) => handleSendMessage(userMessage)}
          isLoading={isLoading}
          placeholder="Record a message..."
        />
      </div>
    </div>
  );
};

export default PersistentChatInterface;
