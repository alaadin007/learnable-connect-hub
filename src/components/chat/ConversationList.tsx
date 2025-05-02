
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Star, Search, Filter, Tag } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  topic: string | null;
  last_message_at: string;
  starred?: boolean;
  tags?: string[];
  category?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  loadingConversations: boolean;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onRefreshConversations: () => void;
}

export function ConversationList({
  conversations,
  loadingConversations,
  onSelectConversation,
  onStartNewConversation,
  onRefreshConversations,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  // Get unique categories for filtering
  const categories = Array.from(
    new Set(
      conversations
        .map((convo) => convo.category)
        .filter(Boolean) as string[]
    )
  );

  // Filter conversations based on search and filters
  const filteredConversations = conversations.filter((convo) => {
    // Apply search filter
    const matchesSearch =
      !searchTerm ||
      convo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convo.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convo.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    // Apply category filter
    const matchesCategory = !filterCategory || convo.category === filterCategory;

    // Apply starred filter
    const matchesStarred = !showStarredOnly || convo.starred;

    return matchesSearch && matchesCategory && matchesStarred;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Past Conversations</CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onStartNewConversation}>
            New
          </Button>
          <Button variant="outline" size="sm" onClick={onRefreshConversations}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={showStarredOnly ? "secondary" : "outline"}
              size="sm"
              className="h-7"
              onClick={() => setShowStarredOnly(!showStarredOnly)}
            >
              <Star className="h-3.5 w-3.5 mr-1" />
              Starred
            </Button>
            
            {filterCategory && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterCategory(null)}>
                {filterCategory} ✕
              </Badge>
            )}
          </div>

          {categories.length > 0 && !filterCategory && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant="outline"
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setFilterCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {loadingConversations ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">
            {conversations.length === 0
              ? "No conversations yet. Start chatting!"
              : "No conversations match your search."}
          </p>
        ) : (
          <ScrollArea className="h-[240px] pr-4">
            <ul className="space-y-2">
              {filteredConversations.map((convo) => (
                <li key={convo.id}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => onSelectConversation(convo.id)}
                  >
                    <div className="flex flex-col items-start gap-1 w-full">
                      <div className="flex items-center gap-2 w-full">
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="font-medium truncate max-w-[180px]">
                          {convo.title || "Untitled Conversation"}
                        </span>
                        {convo.starred && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 ml-auto shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(convo.last_message_at)}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {convo.topic && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                            {convo.topic}
                          </span>
                        )}
                        {convo.category && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                            {convo.category}
                          </span>
                        )}
                      </div>
                      {convo.tags && convo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {convo.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-xs flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full">
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                          {convo.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{convo.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
