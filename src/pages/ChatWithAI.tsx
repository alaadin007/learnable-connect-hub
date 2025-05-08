
import React, { useState, useEffect, useCallback } from 'react';
import { AIChatInterface } from '@/components/chat/AIChatInterface';
import { ConversationList } from '@/components/chat/ConversationList';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ChatWithAI: React.FC = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations.");
      } else {
        setConversations(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleConversationCreated = (id: string) => {
    setActiveConversationId(id);
    fetchConversations(); // Refresh conversations after creating a new one
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    setCurrentTopic(newTopic.trim());
    setNewTopic('');
  };

  const renderChatInterface = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
    }
    
    if (activeConversationId) {
      return (
        <AIChatInterface 
          conversationId={activeConversationId} 
          topic={currentTopic}
          onConversationCreated={handleConversationCreated}
        />
      );
    }
    
    return (
      <AIChatInterface 
        topic={currentTopic}
        onConversationCreated={handleConversationCreated}
      />
    );
  };

  return (
    <div className="container mx-auto p-4 flex flex-col md:flex-row h-screen">
      {/* Conversation List */}
      <div className="md:w-1/4 pr-4 border-r border-border">
        <h2 className="text-lg font-semibold mb-4">Your Conversations</h2>
        <ConversationList
          conversations={conversations}
          selectedId={activeConversationId || undefined}
          onSelectConversation={(id) => setActiveConversationId(id)}
          onRefresh={fetchConversations}
        />
      </div>

      {/* Chat Interface */}
      <div className="md:w-3/4 pl-4 flex flex-col">
        {currentTopic ? (
          <>
            <h2 className="text-lg font-semibold mb-4">Topic: {currentTopic}</h2>
            {renderChatInterface()}
          </>
        ) : (
          <div className="flex-grow flex flex-col justify-center items-center">
            <h2 className="text-2xl font-semibold mb-4">Start a New Conversation</h2>
            <form onSubmit={handleTopicSubmit} className="flex flex-col items-center space-y-4">
              <Label htmlFor="topic-input">Enter a Topic:</Label>
              <Input
                id="topic-input"
                type="text"
                placeholder="e.g., Quantum Physics, History of Rome"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-full max-w-md"
              />
              <Button type="submit" disabled={!newTopic.trim()}>Start Chat</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWithAI;
