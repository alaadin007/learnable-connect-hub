
// Define types for analytics data
export interface Student {
  id: string;
  name: string;
}

export interface SessionData {
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

// New interface for analytics filters
export interface AnalyticsFilters {
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  studentId?: string;
}

// Interface for summary statistics
export interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}
