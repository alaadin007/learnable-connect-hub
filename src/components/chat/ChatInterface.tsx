
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Star, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import sessionLogger from "@/utils/sessionLogger"; // Fixed import statement
import { Badge } from "@/components/ui/badge";
import VoiceRecorder from "./VoiceRecorder";
import TextToSpeech from "./TextToSpeech";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SourceCitation {
  filename: string;
  document_id: string;
  relevance_score?: number;
  excerpt?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  is_important?: boolean;
  feedback_rating?: number;
  document_citations?: SourceCitation[];
}

// Define the database message structure to match what's returned from Supabase
interface DatabaseMessage {
  id: string;
  content: string;
  conversation_id: string;
  feedback_rating: number | null;
  is_important: boolean;
  sender: string;
  timestamp: string;
  document_citations?: SourceCitation[] | null;
}

interface ChatInterfaceProps {
  sessionId: string | undefined;
  topic: string;
  onSessionStart: (sessionId: string) => void;
  selectedConversationId?: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  sessionId, 
  topic, 
  onSessionStart, 
  selectedConversationId 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [useDocuments, setUseDocuments] = useState<boolean>(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string>("");
  const [showSourceInfo, setShowSourceInfo] = useState<string | null>(null);

  // Function to scroll to the bottom of the chat
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Update conversation ID when selectedConversationId changes
  useEffect(() => {
    if (selectedConversationId) {
      setConversationId(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Load existing messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      loadConversationDetails(conversationId);
    } else {
      setMessages([]); // Clear messages if no conversation is selected
      setConversationTitle(""); // Clear title
    }
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize session and conversation
  useEffect(() => {
    const initializeChat = async () => {
      if (!sessionId && !selectedConversationId) {
        // Start a new session and conversation
        // Fix: Pass the required user ID parameter to startSession
        const newSessionId = await sessionLogger.startSession(topic, user?.id || 'anonymous');
        if (newSessionId) {
          onSessionStart(newSessionId);
        } else {
          toast({
            title: "Error",
            description: "Failed to start a new session.",
            variant: "destructive",
          });
        }
      }
    };

    if (!sessionId && !selectedConversationId) {
      initializeChat();
    }
  }, [sessionId, topic, onSessionStart, toast, selectedConversationId, user?.id]);

  const createConversation = async (): Promise<string | null> => {
    try {
      // Get user's school ID
      const { data: schoolData, error: schoolError } = await supabase.rpc('get_user_school_id');
      
      if (schoolError) {
        throw schoolError;
      }
      
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ 
          user_id: user?.id as string, 
          school_id: schoolData,
          title: `Conversation started on ${new Date().toLocaleDateString()}`,
          topic: topic || null,
          last_message_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "New Conversation",
        description: "A new conversation has been started.",
      });
      return data.id;
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to create a new conversation.",
        variant: "destructive",
      });
      return null;
    }
  };

  const loadConversationDetails = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('title, topic')
        .eq('id', conversationId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setConversationTitle(data.title || "Untitled Conversation");
        if (data.topic) {
          // Update the topic in the parent component
          // Note: We're assuming there's a way to pass this back to the parent
        }
      }
    } catch (error: any) {
      console.error("Error loading conversation details:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) {
        throw error;
      }

      // Convert from database format to chat message format
      // Now properly typed with DatabaseMessage which includes document_citations
      const formattedMessages = data.map((msg: DatabaseMessage) => ({
        id: msg.id,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp,
        is_important: msg.is_important,
        feedback_rating: msg.feedback_rating,
        document_citations: msg.document_citations
      })) as ChatMessage[];

      setMessages(formattedMessages);
    } catch (error: any) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const newMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    try {
      // Create a new conversation if we don't have one
      let currentConvoId = conversationId;
      if (!currentConvoId) {
        currentConvoId = await createConversation();
        if (currentConvoId) {
          setConversationId(currentConvoId);
        } else {
          throw new Error("Failed to create conversation");
        }
      }

      // Call the AI function with document context option
      const aiResponse = await getAIResponse(input, currentConvoId);
      
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: aiResponse.response,
        timestamp: new Date().toISOString(),
        document_citations: aiResponse.sourceCitations
      };
      
      setMessages((prev) => [...prev, aiMessage]);

      // Log query count
      if (sessionId) {
        await sessionLogger.incrementQueryCount(sessionId);
      }

      // Update conversation last message timestamp
      await updateConversationLastMessageTime(currentConvoId);

      // Update conversation title if this is the first message
      if (messages.length === 0) {
        await updateConversationTitle(currentConvoId, input);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
      // Revert optimistic update on failure (remove last message)
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const getAIResponse = async (message: string, convoId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: {
          question: message,
          conversationId: convoId,
          sessionId: sessionId,
          topic: topic,
          useDocuments: useDocuments
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting AI response:", error);
      return {
        response: "I'm sorry, I encountered an error while processing your request. Please try again."
      };
    }
  };

  const saveMessagesToSupabase = async (convoId: string, userMessage: ChatMessage, aiMessage: ChatMessage) => {
    try {
      // Save user message and AI response
      await supabase.from('messages').insert([
        {
          conversation_id: convoId,
          content: userMessage.content,
          sender: 'user',
          timestamp: userMessage.timestamp,
        },
        {
          conversation_id: convoId,
          content: aiMessage.content,
          sender: 'ai',
          timestamp: aiMessage.timestamp,
        },
      ]);
    } catch (error: any) {
      console.error("Error saving messages to Supabase:", error);
      toast({
        title: "Error",
        description: "Failed to save messages to database.",
        variant: "destructive",
      });
    }
  };

  const updateConversationLastMessageTime = async (convoId: string) => {
    try {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convoId);
    } catch (error: any) {
      console.error("Error updating conversation last_message_at:", error);
    }
  };

  const updateConversationTitle = async (convoId: string, firstMessage: string) => {
    // Generate a title from the first message (first 30 chars)
    const title = firstMessage.length > 30
      ? `${firstMessage.substring(0, 30)}...`
      : firstMessage;

    try {
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', convoId);

      setConversationTitle(title);
    } catch (error: any) {
      console.error("Error updating conversation title:", error);
    }
  };

  const toggleMessageImportance = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !conversationId) return;

    const newImportance = !message.is_important;

    try {
      // Update in database
      await supabase
        .from('messages')
        .update({ is_important: newImportance })
        .eq('id', messageId);

      // Update in state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, is_important: newImportance } 
            : msg
        )
      );

      toast({
        title: newImportance ? "Marked as important" : "Unmarked as important",
        description: "Message updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating message importance:", error);
      toast({
        title: "Error",
        description: "Failed to update message.",
        variant: "destructive",
      });
    }
  };

  const recordFeedback = async (messageId: string, rating: number) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'assistant' || !conversationId) return;
    
    try {
      // Update in database
      await supabase
        .from('messages')
        .update({ feedback_rating: rating })
        .eq('id', messageId);

      // Update in state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, feedback_rating: rating } 
            : msg
        )
      );

      toast({
        title: "Feedback recorded",
        description: "Thank you for your feedback!",
      });
    } catch (error: any) {
      console.error("Error recording feedback:", error);
      toast({
        title: "Error",
        description: "Failed to record feedback.",
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent newline in input
      sendMessage();
    }
  };

  const toggleUseDocuments = () => {
    setUseDocuments(prev => !prev);
    toast({
      title: useDocuments ? "Documents disabled" : "Documents enabled",
      description: useDocuments 
        ? "AI will not use your documents for context." 
        : "AI will use your uploaded documents for context.",
    });
  };

  const viewDocumentSource = (docId: string) => {
    if (!docId) return;
    
    // Redirect to document viewer or preview (you'll need to implement this)
    window.open(`/documents/view/${docId}`, '_blank');
  };

  const handleTranscriptionComplete = (text: string) => {
    setInput(text);
    
    // Optionally, you could automatically send the message after transcription
    // if you uncomment the following line
    // setTimeout(() => sendMessage(), 500);
  };

  return (
    <Card className="h-[calc(100vh-200px)] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {conversationId ? conversationTitle : "LearnAble AI Chat"}
        </CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={useDocuments ? "default" : "outline"}
                size="sm"
                onClick={toggleUseDocuments}
              >
                {useDocuments ? "Using Documents" : "Not Using Documents"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {useDocuments 
                ? "AI will use your uploaded documents as context" 
                : "AI will rely only on its general knowledge"
              }
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col space-y-4 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-learnable-light text-learnable-dark"
                        : "bg-learnable-blue-light text-learnable-dark"
                    } ${message.is_important ? "border-2 border-yellow-400" : ""}`}
                  >
                    {message.content}
                    
                    {/* Document citations badges */}
                    {message.document_citations && message.document_citations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <p className="text-xs font-medium text-gray-500 w-full mb-1">Sources:</p>
                        {message.document_citations.map((citation, index) => (
                          <div key={index} className="flex items-center">
                            <Badge 
                              variant="outline" 
                              className="hover:bg-secondary cursor-pointer flex items-center gap-1"
                              onClick={() => setShowSourceInfo(showSourceInfo === `${message.id}-${index}` ? null : `${message.id}-${index}`)}
                            >
                              📄 {citation.filename.length > 20 ? citation.filename.substring(0, 20) + '...' : citation.filename}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Source details if expanded */}
                    {message.document_citations && message.document_citations.map((citation, index) => (
                      showSourceInfo === `${message.id}-${index}` && (
                        <div key={`details-${index}`} className="mt-2 p-2 bg-gray-100 rounded text-sm">
                          <div className="font-semibold">{citation.filename}</div>
                          {citation.excerpt && <div className="italic mt-1 text-gray-600">{citation.excerpt}</div>}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-1 h-7 text-xs" 
                            onClick={() => viewDocumentSource(citation.document_id)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> View Document
                          </Button>
                        </div>
                      )
                    ))}
                  </div>
                  
                  {conversationId && (
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleMessageImportance(message.id)}
                        title={message.is_important ? "Unmark as important" : "Mark as important"}
                      >
                        <Star 
                          className={`h-4 w-4 ${message.is_important ? "text-yellow-400 fill-yellow-400" : "text-gray-400"}`} 
                        />
                      </Button>
                      
                      {message.role === "assistant" && (
                        <>
                          <TextToSpeech text={message.content} />
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-6 w-6 ${message.feedback_rating === 1 ? "bg-green-100 dark:bg-green-900" : ""}`}
                            onClick={() => recordFeedback(message.id, 1)}
                            title="Helpful"
                          >
                            <ThumbsUp className={`h-4 w-4 ${message.feedback_rating === 1 ? "text-green-600" : "text-gray-400"}`} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-6 w-6 ${message.feedback_rating === -1 ? "bg-red-100 dark:bg-red-900" : ""}`}
                            onClick={() => recordFeedback(message.id, -1)}
                            title="Not helpful"
                          >
                            <ThumbsDown className={`h-4 w-4 ${message.feedback_rating === -1 ? "text-red-600" : "text-gray-400"}`} />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <span className="text-xs text-gray-500 mt-1">
                  {message.role === "user" ? "You" : "LearnAble AI"} -{" "}
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="rounded-lg px-4 py-2 max-w-[80%] bg-learnable-blue-light text-learnable-dark">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <div className="w-full flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <VoiceRecorder onTranscriptionComplete={handleTranscriptionComplete} />
          <Button onClick={sendMessage} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ChatInterface;
