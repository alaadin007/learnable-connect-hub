
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
  student?: string; // Added missing property
  topicOrContent?: string; // Added missing property
  numQueries?: number; // Added missing property
  startTime?: string; // Added missing property
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

// Adding missing type definitions
export interface StudentPerformanceData {
  id: string;
  name: string;
  avg_score?: number;
  average_score?: number;
  assessments_taken?: number;
  completion_rate?: number;
  last_active?: string;
}

export interface SchoolPerformanceData {
  month: string;
  score?: number;
  avg_monthly_score: number;
  monthly_completion_rate: number;
  score_improvement_rate: number;
  completion_improvement_rate: number;
}

export interface SchoolPerformanceSummary {
  averageScore?: number;
  completionRate?: number;
  participationRate?: number;
  trend?: "up" | "down" | "stable";
  changePercentage?: number;
  total_assessments: number;
  students_with_submissions: number;
  total_students: number;
  avg_submissions_per_assessment: number;
  avg_score: number;
  completion_rate: number;
  student_participation_rate: number;
}

export interface TeacherPerformanceData {
  id: string;
  name: string;
  email?: string;
  assessments_created?: number;
  students_assessed?: number;
  avg_student_score?: number;
  avg_submissions_per_assessment?: number;
  completion_rate?: number;
  last_active?: string;
}
