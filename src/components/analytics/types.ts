
// Define date range interface
export interface DateRange {
  from: Date;
  to?: Date | undefined;
}

// Define analytics filters interface
export interface AnalyticsFilters {
  dateRange?: DateRange;
  teacherId?: string;
  studentId?: string;
}

export interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}

export interface SessionData {
  id: string;
  student_id: string;
  student_name: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  queries_count: number;
  topic?: string;
}

export interface TopicData {
  id: string;
  topic: string;
  count: number;
  percentage: number;
  // Compatibility fields
  name?: string;
  value?: number;
}

export interface StudyTimeData {
  student_id: string;
  student_name: string;
  total_minutes: number;
  sessions_count: number;
  // Compatibility fields
  name?: string;
  studentName?: string;
  hours?: number;
}

export interface TeacherPerformanceData {
  id: string;
  name: string;
  students: number;
  submissions: number;
  completion_rate: number;
  avg_score: number;
}

export interface StudentPerformanceData {
  id: string;
  student_name: string;
  email: string;
  assessments_taken: number;
  completed_assessments: number;
  avg_score: number;
  improvement_rate: number;
  last_assessment_date: string;
  completion_rate: number;
  last_active: string;
  name?: string;
  average_score?: number;
}

export interface SchoolPerformanceData {
  date: string;
  avg_score: number;
  completion_rate: number;
  student_count: number;
  assessment_count: number;
}

export interface PerformanceSummary {
  total_assessments: number;
  total_students: number;
  students_with_submissions: number;
  student_participation_rate: number;
  avg_score: number;
  completion_rate: number;
  improvement_rate: number;
  avg_submissions_per_assessment: number;
}
