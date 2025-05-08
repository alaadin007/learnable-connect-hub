
// Ensure our DateRange type is properly defined
export interface DateRange {
  from: Date;
  to: Date; // Making to required to fix type issues
}

export interface SessionLog {
  id: string;
  user_id: string;
  topic_or_content_used: string;
  session_start: string;
  session_end: string;
  num_queries: number;
  profiles: {
    full_name: string;
  };
}

export interface TeacherAnalyticsData {
  id: string;
  name: string;
  assessmentsCount: number;
  averageScore: number;
  completionRate: number;
  studentsAssessed: number;
}

export interface StudentAnalyticsFilterProps {
  schoolId: string;
  selectedStudentId: string;
  dateRange: DateRange;
}
