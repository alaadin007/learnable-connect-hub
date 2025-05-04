
import { DateRange } from "react-day-picker";

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
  user_id?: string;
  student_id: string;
  student_name: string;
  userId?: string;
  userName?: string;
  session_date: string;
  duration_minutes: number;
  topics: string[];
  topic?: string;
  questions_asked: number;
  questions_answered?: number;
  queries?: number;
}

export interface TopicData {
  topic: string;
  name?: string;
  count: number;
  value?: number;
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

export interface Student {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
}
