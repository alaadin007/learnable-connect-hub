
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
  onArchiveConversation?: (id: string) => void;
}

export interface VoiceRecorderProps {
  onTranscript: (transcript: string) => void;
  setIsRecording?: React.Dispatch<React.SetStateAction<boolean>>;
  isRecording?: boolean;
}

export interface TextToSpeechProps {
  message?: string;
  messages?: Message[];
}

// Add types for session logger
export interface SessionLogResult {
  id: string;
  success: boolean;
  error?: string;
}

export interface PerformanceData {
  accuracy?: number;
  speed?: number;
  completion?: number;
}
