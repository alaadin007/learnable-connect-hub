
import { DateRange as CalendarDateRange } from "react-day-picker";

export interface DateRange extends CalendarDateRange {
  from: Date | undefined;
  to?: Date;
}

export interface AnalyticsFilters {
  dateRange?: DateRange;
  schoolId?: string;
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
  student_name: string;
  student_id: string;
  session_date: string;
  duration_minutes: number;
  topics: string[];
  questions_asked: number;
  questions_answered: number;
  
  // Compatibility fields for existing code
  userId?: string;
  userName?: string;
  student?: string;
  topicOrContent?: string;
  topic?: string;
  startTime?: string;
  endTime?: string | null;
  duration?: string | number;
  numQueries?: number;
  queries?: number;
}

export interface TopicData {
  topic: string;
  count: number;
  
  // Compatibility fields for existing code
  name?: string;
  value?: number;
}

export interface StudyTimeData {
  student_name: string;
  student_id: string;
  total_minutes: number;
  
  // Compatibility fields for existing code
  studentName?: string;
  name?: string;
  hours?: number;
  week?: number;
  year?: number;
}

export interface Student {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
}

// Performance data types aligned with component expectations
export interface SchoolPerformanceSummary {
  total_assessments: number;
  students_with_submissions: number;
  total_students: number;
  avg_submissions_per_assessment: number;
  avg_score: number;
  completion_rate: number;
  student_participation_rate: number;
  
  // Additional properties from utils
  average_score?: number;
  total_questions?: number;
  improvement_rate?: number;
  averageScore?: number;
  trend?: string;
  changePercentage?: number;
  completionRate?: number;
  participationRate?: number;
}

export interface SchoolPerformanceData {
  month: string;
  avg_monthly_score: number;
  monthly_completion_rate: number;
  score_improvement_rate: number;
  completion_improvement_rate: number;

  // Additional properties from utils
  average_score?: number;
  total_questions?: number;
  score?: number;
  completionRate?: number;
  improvement?: number;
}

export interface TeacherPerformanceData {
  teacher_id: string;
  teacher_name: string;
  assessments_created: number;
  students_assessed: number;
  completion_rate: number;
  avg_student_score: number;
  avg_submissions_per_assessment: number;
  
  // Additional properties from utils
  id?: string;
  name?: string;
  students_count?: number;
  average_score?: number;
  total_questions?: number;
  improvement_rate?: number;
  students?: number;
  avgScore?: number;
  assessmentsCreated?: number;
  completionRate?: number;
  trend?: string;
}

export interface StudentPerformanceData {
  student_id: string;
  student_name: string;
  assessments_taken: number;
  avg_score: number;
  avg_time_spent_seconds: number;
  assessments_completed: number;
  completion_rate: number;
  top_strengths: string;
  top_weaknesses: string;
  
  // Additional properties from utils
  id?: string;
  name?: string;
  teacher_name?: string;
  average_score?: number;
  total_questions?: number;
  improvement_rate?: number;
  teacher?: string;
  avgScore?: number;
  assessmentsTaken?: number;
  completionRate?: number;
  trend?: string;
  subjects?: string[];
  last_active?: string;
}
