
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
import { Loader2, MessageSquare, Star, Search, Filter, Tag, Bookmark, Archive } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface Conversation {
  id: string;
  title: string;
  topic: string | null;
  last_message_at: string;
  starred?: boolean;
  tags?: string[];
  category?: string;
  summary?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  loadingConversations: boolean;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onRefreshConversations: () => void;
  onToggleStar?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onArchiveConversation?: (id: string) => void;
  onGenerateSummary?: (id: string) => void;
}

export function ConversationList({
  conversations,
  loadingConversations,
  onSelectConversation,
  onStartNewConversation,
  onRefreshConversations,
  onToggleStar,
  onDeleteConversation,
  onArchiveConversation,
  onGenerateSummary
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  // Get unique categories for filtering
  const categories = Array.from(
    new Set(
      conversations
        .map((convo) => convo.category)
        .filter(Boolean) as string[]
    )
  );
  
  // Get unique tags for filtering
  const allTags = new Set<string>();
  conversations.forEach(convo => {
    if (convo.tags && convo.tags.length > 0) {
      convo.tags.forEach(tag => allTags.add(tag));
    }
  });
  const uniqueTags = Array.from(allTags);

  // Filter conversations based on search and filters
  const filteredConversations = conversations.filter((convo) => {
    // Apply search filter
    const matchesSearch =
      !searchTerm ||
      convo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convo.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convo.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      convo.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    // Apply category filter
    const matchesCategory = !filterCategory || convo.category === filterCategory;
    
    // Apply tag filter
    const matchesTag = !selectedTag || (convo.tags && convo.tags.includes(selectedTag));

    // Apply starred filter
    const matchesStarred = !showStarredOnly || convo.starred;

    return matchesSearch && matchesCategory && matchesTag && matchesStarred;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const clearFilters = () => {
    setFilterCategory(null);
    setSelectedTag(null);
    setShowStarredOnly(false);
    setSearchTerm("");
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

          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant={showStarredOnly ? "secondary" : "outline"}
              size="sm"
              className="h-7"
              onClick={() => setShowStarredOnly(!showStarredOnly)}
            >
              <Star className="h-3.5 w-3.5 mr-1" />
              Starred
            </Button>
            
            {/* Categories dropdown */}
            {categories.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    Category
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {categories.map((category) => (
                    <DropdownMenuItem
                      key={category}
                      className={filterCategory === category ? "bg-muted" : ""}
                      onClick={() => setFilterCategory(category === filterCategory ? null : category)}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Tags dropdown */}
            {uniqueTags.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7">
                    <Tag className="h-3.5 w-3.5 mr-1" />
                    Tags
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueTags.map((tag) => (
                    <DropdownMenuItem
                      key={tag}
                      className={selectedTag === tag ? "bg-muted" : ""}
                      onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    >
                      {tag}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Active filters display */}
            {(filterCategory || selectedTag || showStarredOnly) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Active filters badges */}
          {(filterCategory || selectedTag) && (
            <div className="flex flex-wrap gap-1">
              {filterCategory && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterCategory(null)}>
                  {filterCategory} ✕
                </Badge>
              )}
              
              {selectedTag && (
                <Badge variant="outline" className="cursor-pointer" onClick={() => setSelectedTag(null)}>
                  # {selectedTag} ✕
                </Badge>
              )}
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
                  <div className="relative group">
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
                        
                        {convo.summary && (
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {convo.summary}
                          </span>
                        )}
                        
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
                    
                    {/* Actions dropdown */}
                    {(onToggleStar || onDeleteConversation || onArchiveConversation || onGenerateSummary) && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <span className="sr-only">Open menu</span>
                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                                <path d="M3.625 7.5C3.625 8.12 3.12 8.625 2.5 8.625C1.88 8.625 1.375 8.12 1.375 7.5C1.375 6.88 1.88 6.375 2.5 6.375C3.12 6.375 3.625 6.88 3.625 7.5ZM8.625 7.5C8.625 8.12 8.12 8.625 7.5 8.625C6.88 8.625 6.375 8.12 6.375 7.5C6.375 6.88 6.88 6.375 7.5 6.375C8.12 6.375 8.625 6.88 8.625 7.5ZM13.625 7.5C13.625 8.12 13.12 8.625 12.5 8.625C11.88 8.625 11.375 8.12 11.375 7.5C11.375 6.88 11.88 6.375 12.5 6.375C13.12 6.375 13.625 6.88 13.625 7.5Z" fill="currentColor"></path>
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onToggleStar && (
                              <DropdownMenuItem onClick={() => onToggleStar(convo.id)}>
                                <Star className="h-4 w-4 mr-2" />
                                {convo.starred ? "Remove star" : "Star conversation"}
                              </DropdownMenuItem>
                            )}
                            
                            {onGenerateSummary && (
                              <DropdownMenuItem onClick={() => onGenerateSummary(convo.id)}>
                                <Bookmark className="h-4 w-4 mr-2" />
                                Generate summary
                              </DropdownMenuItem>
                            )}
                            
                            {onArchiveConversation && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onArchiveConversation(convo.id)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {onDeleteConversation && (
                              <DropdownMenuItem 
                                className="text-red-600 hover:text-red-600"
                                onClick={() => onDeleteConversation(convo.id)}
                              >
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2">
                                  <path d="M5.5 1C5.22386 1 5 1.22386 5 1.5C5 1.77614 5.22386 2 5.5 2H9.5C9.77614 2 10 1.77614 10 1.5C10 1.22386 9.77614 1 9.5 1H5.5ZM3 3.5C3 3.22386 3.22386 3 3.5 3H11.5C11.7761 3 12 3.22386 12 3.5C12 3.77614 11.7761 4 11.5 4H3.5C3.22386 4 3 3.77614 3 3.5ZM3.5 5C3.22386 5 3 5.22386 3 5.5C3 5.77614 3.22386 6 3.5 6H4V12C4 12.5523 4.44772 13 5 13H10C10.5523 13 11 12.5523 11 12V6H11.5C11.7761 6 12 5.77614 12 5.5C12 5.22386 11.7761 5 11.5 5H3.5ZM5 6H10V12H5V6Z" fill="currentColor"></path>
                                </svg>
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
