
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Key } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from 'ai/react';
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useSettings } from "@/contexts/SettingsContext";
import { useCompletion } from 'ai/react';
import { supabase } from '@/integrations/supabase/client';

// Define the API key schema
const ApiKeySchema = z.object({
  provider: z.enum(["openai", "gemini"]),
  apiKey: z.string().min(1, "API key is required")
});

type ApiKeyFormValues = z.infer<typeof ApiKeySchema>;

const AIChatInterface = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Simplified state management - avoiding excessive state variables
  const [apiKeyState, setApiKeyState] = useState({
    apiKey: "",
    provider: "openai",
    isValid: true,
    errorMessage: null as string | null
  });

  // Simplified chat handling
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setIsProcessing(true);
    try {
      // Chat implementation would go here
      toast({
        title: "Message sent",
        description: "Your message is being processed."
      });
      setMessage("");
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Simplified API key form submission
  const handleApiKeySubmit = async (values: ApiKeyFormValues) => {
    setApiKeySaving(true);
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user?.id,
          provider: values.provider,
          api_key: values.apiKey
        }, { onConflict: 'user_id,provider' });

      if (error) throw error;

      toast({
        title: "API Key Saved",
        description: "Your API key has been successfully saved"
      });
      
      setShowApiKeyForm(false);
    } catch (error: any) {
      console.error("Error saving API key:", error);
      toast({
        variant: "destructive",
        title: "Error saving API key",
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setApiKeySaving(false);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle>AI Chat</CardTitle>
        <CardDescription>
          Chat with our AI assistant to get help with your studies
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="flex-grow overflow-y-auto mb-4 p-4 border rounded-md">
          {/* Chat messages would render here */}
          <div className="text-center text-gray-500 my-8">
            Start a conversation with the AI assistant...
          </div>
          <div ref={bottomRef} />
        </div>
        
        <div className="mt-auto">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="flex-grow"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isProcessing || !message.trim()}
              className="gradient-bg"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          
          {!settings?.apiKey && (
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => setShowApiKeyForm(true)}
            >
              <Key className="mr-2 h-4 w-4" />
              Set API Key
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChatInterface;
