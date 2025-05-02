
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Paperclip } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      // Check file type
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(fileExt || '')) {
        toast({
          title: "Unsupported file type",
          description: "Please upload a PDF, JPG or PNG file",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "File attached",
        description: `${file.name} has been attached and will be referenced by the AI.`,
      });
      
      // Add a message about the file
      const fileMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `📎 File attached: ${file.name}`,
        isUserMessage: true,
      };
      
      setMessages((prevMessages) => [...prevMessages, fileMessage]);
      
      // Reset the file input
      if (event.target) {
        event.target.value = '';
      }
    }
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
          <div className="relative flex-grow">
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
              className="pr-10"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0" 
              onClick={handleFileUpload}
            >
              <Paperclip className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
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
