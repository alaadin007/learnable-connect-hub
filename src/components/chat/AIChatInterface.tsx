
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2, Copy, CheckCircle, AlertCircle, Key } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompletion } from "ai/react";
import { useProStore } from "@/stores/useProStore";
import { increment } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import sessionLogger from "@/utils/sessionLogger";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormDescription, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const ApiKeySchema = z.object({
  provider: z.enum(['openai', 'gemini']),
  apiKey: z.string().min(1, "API key is required"),
});

const AIChatInterface = () => {
  const [topic, setTopic] = useState<string>("");
  const [isTopicCopied, setIsTopicCopied] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPro, credits, decrementCredits } = useProStore();
  const { settings, updateSettings } = useSettings();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [queryCount, setQueryCount] = useState(0);
  const copyTimeout = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Check if API key is configured
  const isApiKeyConfigured = settings?.aiProvider === 'openai' 
    ? !!settings?.openAiKey 
    : !!settings?.geminiKey;
  
  // Initialize completion and handle AI responses
  const {
    completion,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
  } = useCompletion({
    api: "/api/completion",
    max: settings?.maxTokens || 400,  // Changed from maxTokens to max
    temperature: settings?.temperature || 0.5,
    // Track session and usage
    onFinish: () => {
      if (activeSessionId) {
        sessionLogger.incrementQueryCount(activeSessionId);
        setQueryCount(prevCount => prevCount + 1);
      }
      if (isPro === false) {
        decrementCredits();
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      });
    },
  });
  
  const apiKeyForm = useForm({
    resolver: zodResolver(ApiKeySchema),
    defaultValues: {
      provider: settings?.aiProvider || 'openai',
      apiKey: '',
    },
  });
  
  // Start session when component mounts
  useEffect(() => {
    const startSession = async () => {
      const sessionId = await sessionLogger.startSession(topic, user?.id);
      setActiveSessionId(sessionId);
    };
    
    if (topic) {
      startSession();
    }
    
    return () => {
      if (activeSessionId) {
        sessionLogger.endSession();
      }
    };
  }, [topic, user?.id]);
  
  // Update session topic when it changes
  useEffect(() => {
    if (activeSessionId) {
      sessionLogger.updateTopic(activeSessionId, topic);
    }
  }, [topic, activeSessionId]);
  
  // Check for API key on component mount
  useEffect(() => {
    if (!isApiKeyConfigured) {
      setShowApiKeyDialog(true);
    }
  }, [isApiKeyConfigured]);

  const handleTopicSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) {
      toast({
        title: "Please enter a topic.",
        description: "You must enter a topic to start a session.",
      });
      return;
    }
    setTopic(input);
    setInput("");
  };

  const handleCopyTopic = () => {
    navigator.clipboard.writeText(topic);
    setIsTopicCopied(true);
    toast({
      title: "Topic copied to clipboard!",
    });

    clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => {
      setIsTopicCopied(false);
    }, 2000);
  };

  const handleCreditsError = () => {
    toast({
      variant: "destructive",
      title: "Not enough credits!",
      description:
        "You have run out of free credits. Subscribe to Pro to continue.",
    });
  };

  const handleChatSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!isApiKeyConfigured) {
      setShowApiKeyDialog(true);
      return;
    }
    
    if (isPro === false && credits <= 0) {
      handleCreditsError();
      return;
    }
    if (!topic) {
      toast({
        title: "Please enter a topic.",
        description: "You must enter a topic to start a session.",
      });
      return;
    }
    if (!input.trim()) {
      toast({
        title: "Please enter a message.",
        description: "You must enter a message to send.",
      });
      return;
    }
    handleSubmit(event);
  };
  
  const onApiKeySubmit = async (values: z.infer<typeof ApiKeySchema>) => {
    try {
      // Update settings based on provider
      if (values.provider === 'openai') {
        updateSettings({
          aiProvider: 'openai',
          openAiKey: values.apiKey
        });
      } else {
        updateSettings({
          aiProvider: 'gemini',
          geminiKey: values.apiKey
        });
      }
      
      toast({
        title: "API Key saved",
        description: `Your ${values.provider === 'openai' ? 'OpenAI' : 'Gemini'} API key has been saved. You can now use the chat interface.`,
      });
      
      setShowApiKeyDialog(false);
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        variant: "destructive",
        title: "Error saving API key",
        description: "There was a problem saving your API key. Please try again.",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {!topic ? (
        <Card className="w-full">
          <CardContent>
            <form onSubmit={handleTopicSubmit} className="flex items-center">
              <Input
                ref={inputRef}
                placeholder="Enter a topic to discuss..."
                value={input}
                onChange={handleInputChange}
                className="mr-2"
              />
              <Button type="submit" disabled={isLoading || !isApiKeyConfigured}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  "Start Session"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="relative rounded-md border bg-muted/50 p-4 mb-4">
          <div className="absolute top-2 right-2 flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyTopic}
              disabled={isTopicCopied}
            >
              {isTopicCopied ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm font-medium leading-none">Topic</p>
          <p className="text-sm text-muted-foreground">{topic}</p>
        </div>
      )}

      <div className="space-y-4 flex-grow">
        <div className="rounded-md border bg-secondary/50 p-4 text-sm">
          {completion ? (
            <p>{completion}</p>
          ) : (
            <p className="text-muted-foreground">
              {topic
                ? "Start the conversation..."
                : "Enter a topic to start a conversation..."}
            </p>
          )}
        </div>
      </div>

      <Card className="w-full mt-4">
        <CardContent>
          {!isPro && credits <= 0 ? (
            <div className="rounded-md border bg-destructive/15 p-3 py-2 text-sm text-destructive">
              <AlertCircle className="mr-2 h-4 w-4" />
              You have run out of free credits. Subscribe to Pro to continue.
            </div>
          ) : !isApiKeyConfigured ? (
            <div className="rounded-md border bg-yellow-100 p-3 py-2 text-sm text-yellow-800 flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              <span className="flex-grow">You need to configure an API key to use the chat.</span>
              <Button 
                variant="outline" 
                onClick={() => setShowApiKeyDialog(true)}
                className="ml-2"
                size="sm"
              >
                <Key className="mr-2 h-4 w-4" />
                Set API Key
              </Button>
            </div>
          ) : (
            <form onSubmit={handleChatSubmit} className="flex items-center">
              <Input
                placeholder="Enter your message..."
                value={input}
                onChange={handleInputChange}
                className="mr-2"
                disabled={isLoading || !topic}
              />
              <Button
                type="submit"
                disabled={isLoading || !topic}
                className="gradient-bg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
              {isLoading && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={stop}
                  className="ml-2"
                >
                  Stop
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>
      
      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure AI Provider</DialogTitle>
            <DialogDescription>
              Choose an AI provider and enter your API key to start using the chat interface.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...apiKeyForm}>
            <form onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)} className="space-y-6">
              <FormField
                control={apiKeyForm.control}
                name="provider"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Choose AI Provider</FormLabel>
                    <FormControl>
                      <RadioGroup 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="openai" id="openai" />
                          <Label htmlFor="openai">OpenAI (GPT models)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="gemini" id="gemini" />
                          <Label htmlFor="gemini">Google Gemini AI</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={apiKeyForm.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={apiKeyForm.watch("provider") === 'openai' ? "sk-..." : "AI..."}
                        {...field}
                        type="password"
                      />
                    </FormControl>
                    <FormDescription>
                      {apiKeyForm.watch("provider") === 'openai' 
                        ? "Enter your OpenAI API key. Find it at: https://platform.openai.com/api-keys" 
                        : "Enter your Google Gemini API key. Find it at: https://makersuite.google.com/app/apikeys"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="sm:justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowApiKeyDialog(false)}
                  disabled={!isApiKeyConfigured}
                >
                  Cancel
                </Button>
                <Button type="submit">Save API Key</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIChatInterface;
