
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, RefreshCw, Star, Trash2 } from 'lucide-react';
import { ConversationListProps } from './types';

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelectConversation,
  onRefresh
}) => {
  return (
    <ScrollArea className="h-[calc(100vh-15rem)] w-full rounded-md border">
      <div className="p-4">
        {conversations.length > 0 ? (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`flex items-center space-x-2 p-2 rounded-md hover:bg-secondary cursor-pointer ${
                selectedId === conversation.id ? 'bg-secondary' : ''
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <Avatar>
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div className="flex-grow overflow-hidden">
                <p className="text-sm font-medium leading-none truncate">
                  {conversation.title || 'Untitled Conversation'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {conversation.topic || 'No Topic'}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation(); 
                    onRefresh();
                  }}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                    <Star className="mr-2 h-4 w-4" />
                    Favorite
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-500" onClick={(e) => e.stopPropagation()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No conversations yet
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default ConversationList;
