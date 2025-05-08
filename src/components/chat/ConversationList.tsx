import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, RefreshCw, Star, Trash2 } from 'lucide-react';

export interface ConversationListProps {
  conversations: any[];
  selectedId?: string;
  onSelectConversation: (id: string) => void;
  onRefresh: () => Promise<void>;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelectConversation,
  onRefresh
}) => {
  return (
    <ScrollArea className="h-[calc(100vh-10rem)] w-full rounded-md border">
      <div className="p-4">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`flex items-center space-x-2 p-2 rounded-md hover:bg-secondary cursor-pointer ${
              selectedId === conversation.id ? 'bg-secondary' : ''
            }`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-none">{conversation.title || 'Untitled Conversation'}</p>
              <p className="text-sm text-muted-foreground">
                {conversation.topic || 'No Topic'}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="ml-auto h-8 w-8 p-0">
                  <span className="sr-only">Open dropdown menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={onRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Star className="mr-2 h-4 w-4" />
                  Favorite
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-500">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
