export interface Student {
  id: string;
  name: string;
  email?: string;
  school_id?: string;
  // Add any other properties that might be relevant
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  school_id?: string;
  is_supervisor?: boolean;
  // Add any other properties that might be relevant
}

export interface School {
  id: string;
  name: string;
  code: string;
  contact_email?: string;
  description?: string;
}

export interface PerformanceMetrics {
  avg_score?: number;
  completion_rate?: number;
  assessments_taken?: number;
  assessments_completed?: number;
  avg_time_spent_seconds?: number;
  total_submissions?: number;
}

export interface AnalyticsFilters {
  dateRange?: {
    from: Date;
    to?: Date;
  };
  studentId?: string;
  teacherId?: string;
  schoolId?: string;
  subject?: string;
}

export interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}

export interface SessionData {
  id: string;
  student_id?: string;
  student_name?: string;
  userName?: string;
  session_date: string;
  duration_minutes: number;
  topic?: string;
  topics?: string[];
  questions_asked?: number;
  questions_answered?: number;
  userId?: string;
  queries?: number;
}

export interface TopicData {
  topic: string;
  count: number;
  name: string;
  value: number;
}

export interface StudyTimeData {
  student_id: string;
  student_name: string;
  total_minutes: number;
  name?: string;
  studentName?: string;
  hours?: number;
  week?: number;
  year?: number;
}
