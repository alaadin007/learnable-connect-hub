
export interface SessionData {
  id: string;
  student_id: string;
  student_name?: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  queries_count: number;
  topic?: string;
  // Add compatibility fields for existing code
  session_date?: string;
  userId?: string;
  userName?: string;
  queries?: number;
  topics?: string[];
  questions_asked?: number;
  questions_answered?: number;
}

export interface TopicData {
  id: string;
  topic: string;
  count: number;
  percentage: number;
  // Add compatibility fields for existing code
  name?: string;
  value?: number;
}

export interface StudyTimeData {
  student_id: string;
  student_name: string;
  total_minutes: number;
  sessions_count: number;
  // Add compatibility fields for existing code
  name?: string;
  studentName?: string;
  hours?: number;
  week?: number;
  year?: number;
}

export interface StudentPerformanceData {
  id: string;
  student_id: string;
  student_name: string;
  email?: string;
  assessments_taken: number;
  completed_assessments?: number;
  avg_score: number;
  average_score?: number; // Alias for backward compatibility
  improvement_rate?: number;
  last_assessment_date?: string;
  last_active?: string;
  completion_rate: number;
  name?: string; // For backward compatibility
}

export interface SchoolPerformanceData {
  date: string;
  avg_score: number;
  completion_rate: number;
  student_count: number;
  assessment_count: number;
}

export interface SchoolPerformanceSummary {
  total_assessments: number;
  total_students: number;
  students_with_submissions: number;
  student_participation_rate: number;
  avg_score: number;
  completion_rate: number;
  improvement_rate: number;
  avg_submissions_per_assessment: number;
}

export interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}

export interface TeacherPerformanceData {
  id: string;
  name: string;
  assessments_created: number;
  students_assessed: number;
  avg_score: number;
  completion_rate: number;
}

export interface AnalyticsFilters {
  dateRange?: DateRange;
  teacherId?: string;
  studentId?: string;
}

export interface DateRange {
  from: Date;
  to?: Date;
}
