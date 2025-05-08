
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface ConversationListProps {
  conversations: any[];
  selectedId?: string;
  onSelectConversation: (id: string) => void;
  onRefresh?: () => Promise<void>;
}

export interface VoiceRecorderProps {
  onTranscript: (transcript: string) => void;
  setIsRecording?: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface TextToSpeechProps {
  message?: string;
}

// Add any other chat-related interfaces that are needed
