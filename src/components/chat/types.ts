
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  topic?: string;
  created_at: string;
  last_message_at: string;
  user_id: string;
}

export interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelectConversation: (id: string) => void;
  onRefresh: () => Promise<void>;
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
