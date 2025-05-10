
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, MessageSquare, Timer, Search, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  last_message_at: string;
  topic?: string;
}

interface ChatHistoryProps {
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  activeConversationId?: string | null;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  onSelectConversation,
  onNewConversation,
  activeConversationId,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      const { data, error } = await supabase.functions.invoke("get-conversations");
      
      if (error) {
        throw error;
      }
      
      if (data?.conversations) {
        setConversations(data.conversations);
      } else {
        // If data.conversations is undefined or null, set to empty array
        setConversations([]);
      }
    } catch (error: any) {
      console.error("Error loading conversations:", error);
      setHasError(true);
      toast.error("Failed to load conversation history");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, "'Today at' h:mm a");
    } else if (isYesterday(date)) {
      return format(date, "'Yesterday at' h:mm a");
    } else if (isThisWeek(date)) {
      return format(date, "EEEE 'at' h:mm a");
    } else if (isThisYear(date)) {
      return format(date, "MMM d 'at' h:mm a");
    } else {
      return format(date, "MMM d, yyyy 'at' h:mm a");
    }
  };

  const filteredConversations = conversations.filter(convo => 
    convo.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (convo.topic && convo.topic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRefresh = () => {
    loadConversations();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          Loading...
        </div>
      );
    }
    
    if (hasError) {
      return (
        <div className="text-center py-4">
          <p className="text-muted-foreground mb-2">Failed to load conversations</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      );
    }
    
    if (filteredConversations.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          {searchTerm ? "No matching conversations found" : "No conversations yet"}
        </div>
      );
    }
    
    return filteredConversations.map((conversation) => (
      <div key={conversation.id}>
        <Button
          variant={activeConversationId === conversation.id ? "default" : "ghost"}
          className={`w-full justify-start mb-1 ${
            activeConversationId === conversation.id ? "" : "hover:bg-accent hover:text-accent-foreground"
          }`}
          onClick={() => onSelectConversation(conversation.id)}
        >
          <div className="flex items-start w-full overflow-hidden">
            <MessageSquare className="h-4 w-4 mr-2 mt-1 shrink-0" />
            <div className="truncate">
              <div className="font-medium truncate">{conversation.title || "Untitled Conversation"}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Timer className="h-3 w-3 mr-1" />
                {formatDate(conversation.last_message_at)}
              </div>
            </div>
          </div>
        </Button>
        <Separator className="my-1" />
      </div>
    ));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Chat History</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onNewConversation} className="gap-1">
              <PlusCircle className="h-4 w-4" /> New
            </Button>
          </div>
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search conversations..." 
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="px-4 py-2">
            {renderContent()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ChatHistory;
