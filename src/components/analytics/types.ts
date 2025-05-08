
export interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
  active_students?: number;
  total_sessions?: number;
  total_queries?: number;
  avg_session_minutes?: number;
  school_id?: string;
  school_name?: string;
  latest_session_start?: string;
}

export interface SessionData {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  topicOrContent: string;
  numQueries: number;
  queries?: number;
  student_name?: string;
  student_id?: string;
  session_start?: string;
  session_end?: string;
  topic_or_content_used?: string;
  content_type?: string;
  topics?: string[];
  questions_asked?: number;
  questions_answered?: number;
  duration_minutes?: number;
  session_date?: string;
  student?: string;
  topic?: string;
}

export interface TopicData {
  topic: string;
  count: number;
  topic_or_content_used?: string;
  count_of_sessions?: number;
  topic_rank?: number;
  name?: string;
  value?: number;
}

export interface StudyTimeData {
  week: number;
  hours: number;
  week_number?: number;
  study_hours?: number;
  user_id?: string;
  student_name?: string;
  studentName?: string;
  year?: number;
  name?: string;
  total_minutes?: number;
  student_id?: string;
  session_week?: number;
  session_year?: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  sessions: SessionData[];
  topics: TopicData[];
  studyTime: StudyTimeData[];
}

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  selectedTeacherId?: string | null;
  selectedStudentId?: string | null;
  teacherId?: string | null;
  studentId?: string | null;
  schoolId?: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  status?: string;
  full_name?: string;
}

export interface StudentPerformanceData {
  id: string;
  name: string;
  avg_score?: number;
  average_score?: number;
  assessments_taken?: number;
  completion_rate?: number;
  last_active?: string;
}
