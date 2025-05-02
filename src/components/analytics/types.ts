
// Importing this file will ensure Lovable recognizes it as needing to be updated
import { 
  SchoolPerformanceData, 
  SchoolPerformanceSummary,
  TeacherPerformanceData,
  StudentPerformanceData
} from '@/utils/analyticsUtils';

// Exports the existing types from the file
export * from '@/components/analytics/types';

// Re-export the new types
export type {
  SchoolPerformanceData,
  SchoolPerformanceSummary,
  TeacherPerformanceData,
  StudentPerformanceData
};

// Add teacherId to AnalyticsFilters
export interface AnalyticsFilters {
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  studentId?: string;
  teacherId?: string;
}
