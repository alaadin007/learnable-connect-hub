// Update the import for useToast to the correct path
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Updated import path

interface ChatMessage {
  id: string;
  text: string;
  isUserMessage: boolean;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom on message change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      isUserMessage: true,
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");

    // Simulate bot response after a short delay
    setTimeout(() => {
      const botMessage: ChatMessage = {
        id: Date.now().toString() + "-bot",
        text: `Echo: ${input}`,
        isUserMessage: false,
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    }, 500);

    toast({
      title: "Message Sent!",
      description: "Your message has been sent to the bot.",
    });
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardContent className="flex-grow overflow-y-auto" ref={chatContainerRef}>
        <div className="flex flex-col space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`text-sm p-2 rounded-md w-fit max-w-[80%] ${
                message.isUserMessage
                  ? "bg-blue-100 ml-auto text-right"
                  : "bg-gray-100 mr-auto"
              }`}
            >
              {message.text}
            </div>
          ))}
        </div>
      </CardContent>
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
          />
          <Button onClick={handleSendMessage}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatInterface;
