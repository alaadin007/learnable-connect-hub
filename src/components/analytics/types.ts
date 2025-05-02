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

export interface SessionData {
  id: string;
  student_name: string;
  student_id: string;
  session_date: string;
  duration_minutes: number;
  topics: string[];
  questions_asked: number;
  questions_answered: number;
}

export interface TopicData {
  topic: string;
  count: number;
}

export interface StudyTimeData {
  student_name: string;
  student_id: string;
  total_minutes: number;
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
