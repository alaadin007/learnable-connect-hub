
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

// Adding SessionData interface that was missing
export interface SessionData {
  id: string;
  student: string;
  topic: string;
  queries: number;
  duration: string;
  startTime: string;
}
