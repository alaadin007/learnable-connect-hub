
// Ensure our DateRange type is properly defined
export interface DateRange {
  from: Date;
  to: Date; // Making to required to fix type issues
}

export interface SessionLog {
  id: string;
  user_id: string;
  topic_or_content_used: string;
  session_start: string;
  session_end: string;
  num_queries: number;
  profiles: {
    full_name: string;
  };
}

export interface TeacherAnalyticsData {
  id: string;
  name: string;
  assessmentsCount: number;
  averageScore: number;
  completionRate: number;
  studentsAssessed: number;
}

export interface StudentAnalyticsFilterProps {
  schoolId?: string;
  selectedStudentId?: string;
  dateRange: DateRange;
}

// Add missing types that were referenced in error messages
export interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}

export interface SessionData {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime?: string;
  duration: number;
  topicOrContent: string;
  numQueries: number;
  // Add fields that match the database schema
  student_name?: string;
  student_id?: string;
  student?: string;
  session_date?: string;
  duration_minutes?: number;
  topic_or_content_used?: string;
  questions_asked?: number;
  queries?: number;
  topics?: string[];
  topic?: string;
}

export interface TopicData {
  topic: string;
  name: string;
  count: number;
  value: number;
}

export interface StudyTimeData {
  studentName: string;
  name: string;
  hours: number;
  week: number;
  year: number;
  // Add fields that match the database schema
  student_name?: string;
  student_id?: string;
  week_number?: number;
  total_minutes?: number;
}

export interface Student {
  id: string;
  name: string;
  full_name?: string;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  selectedTeacherId?: string;
  selectedStudentId?: string;
  schoolId?: string; // Add missing schoolId property
}

export interface StudentPerformanceTableProps {
  students: StudentPerformanceMetric[];
}

export interface StudentPerformanceMetric {
  student_id: string;
  student_name: string;
  avg_score: number;
  assessments_taken: number;
  completion_rate: number;
  avg_time_spent_seconds?: number;
  top_strengths?: string;
  top_weaknesses?: string;
  last_active?: string;
}
