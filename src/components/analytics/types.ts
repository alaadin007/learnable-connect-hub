
export interface AnalyticsFilters {
  dateRange?: { from: Date; to: Date };
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
  student_id?: string;
  student_name: string;
  session_date: string;
  duration_minutes?: number;
  duration?: string | number;
  topics?: string[];
  topic?: string;
  questions_asked?: number;
  questions_answered?: number;
  queries?: number;
  userId?: string;
  userName?: string;
}

export interface TopicData {
  topic: string;
  name?: string;
  count: number;
  value?: number;
}

export interface StudyTimeData {
  student_id?: string;
  student_name: string;
  name?: string;
  studentName?: string;
  total_minutes?: number;
  hours: number;
  week?: number;
  year?: number;
}

export interface Student {
  id: string;
  name: string;
  status?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
}
