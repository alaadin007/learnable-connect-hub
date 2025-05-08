
import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from './types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        "mb-2 p-2 rounded-md max-w-[80%]",
        isUser 
          ? "bg-blue-100 text-right ml-auto" 
          : "bg-gray-100 text-left mr-auto"
      )}
    >
      <div className="text-sm text-gray-600">
        {isUser ? 'You' : 'Assistant'}
      </div>
      <div>{message.content}</div>
      <div className="text-xs text-gray-500">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ChatMessage;
