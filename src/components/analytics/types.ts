
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
}

export interface TopicData {
  topic: string;
  count: number;
  topic_or_content_used?: string;
  count_of_sessions?: number;
  topic_rank?: number;
}

export interface StudyTimeData {
  week: number;
  hours: number;
  week_number?: number;
  study_hours?: number;
  user_id?: string;
  student_name?: string;
  year?: number;
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
}
