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

export interface SchoolPerformanceSummary {
  average_score: number;
  total_questions: number;
  improvement_rate: number;
}

export interface SchoolPerformanceMonthly {
  month: string;
  average_score: number;
  total_questions: number;
}

export interface TeacherPerformance {
  id: string;
  name: string;
  students_count: number;
  average_score: number;
  total_questions: number;
  improvement_rate: number;
}

export interface StudentPerformance {
  id: string;
  name: string;
  teacher_name: string;
  average_score: number;
  total_questions: number;
  improvement_rate: number;
  last_active: string;
}
