export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface Student {
  id: string;
  name: string;
}

export interface SessionData {
  id: string;
  userId: string;
  userName: string;
  topicOrContent: string;
  startTime: string;
  endTime: any;
  duration: string;
  numQueries: number;
  student: string; // For backward compatibility
  topic: string;   // For backward compatibility
  queries: number; // For backward compatibility
}

export interface TopicData {
  topic: string;
  count: number;
  name: string; // For backward compatibility
  value: number; // For backward compatibility
}

export interface StudyTimeData {
  week: number;
  year: number;
  hours: number;
  studentName: string;
	name: string; // For backward compatibility
}

export interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}

export interface AnalyticsFilters {
  dateRange?: DateRange;
  studentId?: string;
  teacherId?: string;
  schoolId?: string;
}

export interface SchoolPerformanceData {
  month: string;
  average_score: number;
}

export interface SchoolPerformanceSummary {
  average_score: number;
  improvement_rate: number;
}

export interface TeacherPerformanceData {
  teacher_name: string;
  average_score: number;
}

export interface StudentPerformanceData {
  student_name: string;
  average_score: number;
}
