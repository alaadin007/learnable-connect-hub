
// Re-export all utilities from the analytics modules
export * from './analytics';

// Re-export specific functions needed by existing components
// This ensures backward compatibility with code that imports from analyticsUtils directly
export {
  // Session and analytics data functions
  fetchAnalyticsSummary,
  fetchSessionLogs,
  fetchTopics,
  fetchStudyTime,
  fetchSchoolPerformance,
  fetchStudentPerformance,
  
  // Student and teacher management
  fetchStudents,
  
  // Helper functions
  getDateRangeText,
  exportAnalyticsToCSV,
  
  // Types re-exports
  type AnalyticsSummary,
  type SessionData,
  type TopicData,
  type StudyTimeData
} from './analytics';

// Re-export the fetchTeacherPerformance function from teacherUtils
export { fetchTeacherPerformance, type TeacherPerformanceData } from './teacherUtils';
