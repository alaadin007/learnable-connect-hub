import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompletion } from "ai/react";
import { useProStore } from "@/stores/useProStore";
import { increment } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import sessionLogger from "@/utils/sessionLogger";

const AIChatInterface = () => {
  const [topic, setTopic] = useState<string>("");
  const [isTopicCopied, setIsTopicCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPro, credits, decrementCredits } = useProStore();
  const { settings } = useSettings();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [queryCount, setQueryCount] = useState(0);
  const copyTimeout = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  
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
    // Adjust max tokens based on settings or default
    maxTokens: settings?.maxTokens || 400,
    // Set temperature based on settings or default
    temperature: settings?.temperature || 0.5,
    // Track session and usage
    onFinish: () => {
      if (activeSessionId) {
        sessionLogger.incrementQueryCount(activeSessionId);
        setQueryCount(increment);
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

  const handleTopicSubmit = (event: React.FormEvent) => {
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

  const handleChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
              <Button type="submit" disabled={isLoading}>
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
    </div>
  );
};

export default AIChatInterface;
