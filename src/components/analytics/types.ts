
export interface AnalyticsFilters {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  studentId?: string;
}

export interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}

export interface Session {
  id: string;
  student: string;
  topic: string;
  queries: number;
  duration: string;
  startTime: string;
}

export interface TopicData {
  name: string;
  value: number;
}

export interface StudyTimeData {
  name: string;
  hours: number;
}

export interface Student {
  id: string;
  name: string;
}

// Adding SessionData interface for analytics components
export interface SessionData {
  id: string;
  student: string;
  topic: string;
  queries: number;
  duration: string;
  startTime: string;
}

// New interfaces for the improved conversation system
export interface Conversation {
  id: string;
  title: string | null;
  topic: string | null;
  user_id: string;
  school_id: string;
  last_message_at: string;
  created_at: string;
  summary: string | null;
  category: string | null;
  tags: string[] | null;
  starred: boolean | null;
}

export interface Message {
  id: string;
  content: string;
  sender: string;
  conversation_id: string;
  timestamp: string;
  is_important: boolean | null;
  feedback_rating: number | null;
}
