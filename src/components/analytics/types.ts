
export interface Student {
  id: string;
  name: string;
  email?: string;
  school_id?: string;
  // Add any other properties that might be relevant
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  school_id?: string;
  is_supervisor?: boolean;
  // Add any other properties that might be relevant
}

export interface School {
  id: string;
  name: string;
  code: string;
  contact_email?: string;
  description?: string;
}

export interface PerformanceMetrics {
  avg_score?: number;
  completion_rate?: number;
  assessments_taken?: number;
  assessments_completed?: number;
  avg_time_spent_seconds?: number;
  total_submissions?: number;
}

export interface AnalyticsFilterOptions {
  startDate?: Date;
  endDate?: Date;
  studentId?: string;
  teacherId?: string;
  subject?: string;
}
