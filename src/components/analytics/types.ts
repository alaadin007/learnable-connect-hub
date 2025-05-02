
// Base types for Analytics
export interface DateRange {
  from: Date | undefined;
  to?: Date;
}

export interface AnalyticsFilters {
  dateRange?: DateRange;
  studentId?: string;
  teacherId?: string;
}

// Student type for student selector
export interface Student {
  id: string;
  name: string;
  email?: string;
}

// Session data for tables and charts
export interface SessionData {
  id: string;
  userId: string;
  userName: string;
  topicOrContent: string;
  startTime: string;
  endTime: string | null;
  duration: number | null | string;
  numQueries: number;
  
  // Additional properties used in the existing code for backward compatibility
  student?: string;
  topic?: string;
  queries?: number;
}

// Topic data for charts
export interface TopicData {
  topic: string;
  count: number;
  percentage?: number;
  
  // Additional properties used in the existing code for backward compatibility
  name?: string;
  value?: number;
}

// Study time data for charts
export interface StudyTimeData {
  week: number;
  year: number;
  hours: number;
  studentName?: string;
  
  // Additional properties used in the existing code for backward compatibility
  name?: string;
}

// Analytics summary
export interface AnalyticsSummary {
  totalSessions: number;
  activeStudents: number;
  totalQueries: number;
  avgSessionMinutes: number;
  latestSessionStart?: string;
}

// School performance metrics
export interface SchoolPerformanceData {
  id: string;
  name: string;
  totalAssessments: number;
  studentsWithSubmissions: number;
  totalStudents: number;
  avgSubmissionsPerAssessment: number;
  avgScore: number;
  completionRate: number;
  studentParticipationRate: number;
}

export interface SchoolPerformanceSummary {
  avgScore: number;
  completionRate: number;
  studentParticipationRate: number;
  totalAssessments: number;
  totalStudents: number;
  studentsWithSubmissions: number;
}

// Teacher performance metrics
export interface TeacherPerformanceData {
  id: string;
  name: string;
  assessmentsCreated: number;
  studentsAssessed: number;
  avgSubmissionsPerAssessment: number;
  avgStudentScore: number;
  completionRate: number;
}

// Student performance metrics
export interface StudentPerformanceData {
  id: string;
  name: string;
  assessmentsTaken: number;
  avgScore: number;
  avgTimeSpentSeconds: number;
  assessmentsCompleted: number;
  completionRate: number;
  topStrengths: string;
  topWeaknesses: string;
}

// For the improvement metrics over time
export interface ImprovementData {
  month: string;
  avgScore: number;
  completionRate: number;
  scoreImprovement: number;
  completionImprovement: number;
}
