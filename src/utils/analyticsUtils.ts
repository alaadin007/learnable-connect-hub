
import { supabase } from '@/integrations/supabase/client';
import {
  AnalyticsData,
  AnalyticsSummary,
  TopicData,
  StudyTimeData,
  SessionData,
  DateRange,
  AnalyticsFilters,
  SchoolPerformanceSummary,
  SchoolPerformanceData,
  TeacherPerformanceData,
  StudentPerformanceData
} from '@/components/analytics/types';

/**
 * Fetch analytics data for a school admin
 */
export const fetchSchoolAnalytics = async (filters: AnalyticsFilters): Promise<AnalyticsData> => {
  try {
    // Build date range filters
    const dateFrom = filters.dateRange.from ? filters.dateRange.from.toISOString() : undefined;
    const dateTo = filters.dateRange.to ? filters.dateRange.to.toISOString() : undefined;
    const teacherId = filters.teacherId;
    const studentId = filters.studentId;
    
    // Fetch summary data
    const { data: summaryData, error: summaryError } = await supabase
      .from('school_analytics_summary')
      .select('*')
      .eq('school_id', filters.schoolId)
      .single();
      
    if (summaryError) {
      console.error("Error fetching analytics summary:", summaryError);
      throw new Error("Failed to fetch analytics summary");
    }
    
    // Fetch session data
    let sessionsQuery = supabase
      .from('session_query_counts')
      .select('*')
      .eq('school_id', filters.schoolId)
      .order('session_start', { ascending: false });
      
    if (dateFrom) {
      sessionsQuery = sessionsQuery.gte('session_start', dateFrom);
    }
    
    if (dateTo) {
      sessionsQuery = sessionsQuery.lte('session_start', dateTo);
    }
    
    if (teacherId) {
      sessionsQuery = sessionsQuery.eq('teacher_id', teacherId);
    }
    
    if (studentId) {
      sessionsQuery = sessionsQuery.eq('user_id', studentId);
    }
    
    // Limit to most recent 100 sessions
    sessionsQuery = sessionsQuery.limit(100);
    
    const { data: sessionsData, error: sessionsError } = await sessionsQuery;
    
    if (sessionsError) {
      console.error("Error fetching session data:", sessionsError);
      throw new Error("Failed to fetch session data");
    }
    
    // Fetch topics data
    let topicsQuery = supabase
      .from('most_studied_topics')
      .select('*')
      .eq('school_id', filters.schoolId)
      .order('count_of_sessions', { ascending: false })
      .limit(10);
      
    const { data: topicsData, error: topicsError } = await topicsQuery;
    
    if (topicsError) {
      console.error("Error fetching topics data:", topicsError);
      throw new Error("Failed to fetch topics data");
    }
    
    // Fetch study time data
    let studyTimeQuery = supabase
      .from('student_weekly_study_time')
      .select('*')
      .eq('school_id', filters.schoolId)
      .order('week_number', { ascending: true });
      
    if (studentId) {
      studyTimeQuery = studyTimeQuery.eq('user_id', studentId);
    }
    
    const { data: studyTimeData, error: studyTimeError } = await studyTimeQuery;
    
    if (studyTimeError) {
      console.error("Error fetching study time data:", studyTimeError);
      throw new Error("Failed to fetch study time data");
    }
    
    // Adapt the data to our expected format
    const sessions = (sessionsData || []).map(session => ({
      id: session.session_id || session.id || '',
      student_id: session.user_id || '',
      student_name: session.student_name || '',
      session_date: session.session_start || '',
      duration_minutes: calculateDuration(session.session_start, session.session_end),
      topics: session.topic_or_content_used ? [session.topic_or_content_used] : [],
      questions_asked: session.num_queries || 0,
      questions_answered: Math.floor(session.num_queries * 0.9) || 0, // Estimate, replace with real data when available
      userId: session.user_id || '',
      userName: session.student_name || '',
      topic: session.topic_or_content_used || '',
      queries: session.num_queries || 0
    }));
    
    const topics = (topicsData || []).map(topic => ({
      topic: topic.topic_or_content_used || '',
      count: topic.count_of_sessions || 0,
      topic_rank: topic.topic_rank || 0
    }));
    
    const studyTime = (studyTimeData || []).map(item => ({
      week: item.week_number || 0,
      hours: item.study_hours || 0,
      studentName: item.student_name || '',
      year: item.year || new Date().getFullYear(),
      week_number: item.week_number || 0,
      study_hours: item.study_hours || 0
    }));
    
    const summary = {
      activeStudents: summaryData?.active_students || 0,
      totalSessions: summaryData?.total_sessions || 0,
      totalQueries: summaryData?.total_queries || 0,
      avgSessionMinutes: summaryData?.avg_session_minutes || 0,
    };
    
    return {
      summary,
      sessions: sessions as SessionData[],
      topics,
      studyTime
    };
    
  } catch (error) {
    console.error("Error in fetchSchoolAnalytics:", error);
    throw error;
  }
};

/**
 * Fetch analytics data for a teacher
 */
export const fetchTeacherAnalytics = async (filters: AnalyticsFilters): Promise<any> => {
  // For now, we'll use the same logic as school analytics but filter by teacher
  return fetchSchoolAnalytics(filters);
};

/**
 * Process raw analytics data into a format suitable for our components
 */
export const adaptTeacherAnalyticsData = (data: any): AnalyticsData => {
  const summary: AnalyticsSummary = {
    activeStudents: data.summary.activeStudents || data.summary.active_students || 0,
    totalSessions: data.summary.totalSessions || data.summary.total_sessions || 0,
    totalQueries: data.summary.totalQueries || data.summary.total_queries || 0,
    avgSessionMinutes: data.summary.avgSessionMinutes || data.summary.avg_session_minutes || 0,
  };
  
  return {
    summary,
    sessions: data.sessions || [],
    topics: data.topics || [],
    studyTime: data.studyTime || []
  };
};

/**
 * Calculate session duration in minutes
 */
const calculateDuration = (start: string | null, end: string | null): number => {
  if (!start || !end) return 0;
  
  const startTime = new Date(start);
  const endTime = new Date(end);
  
  // Return duration in minutes
  return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
};

/**
 * Format data for exporting to various formats
 */
export const formatDataForExport = (data: AnalyticsData, format: 'csv' | 'json' | 'pdf'): string | object => {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'csv':
      return convertToCSV(data);
    case 'pdf':
      // For PDF, we return the data object to be processed by a PDF generation library
      return data;
    default:
      return JSON.stringify(data, null, 2);
  }
};

/**
 * Convert data to CSV format
 */
const convertToCSV = (data: AnalyticsData): string => {
  // Implement CSV conversion logic
  let csvContent = '';
  
  // Add summary data
  csvContent += 'Summary\n';
  csvContent += `Active Students,${data.summary.activeStudents}\n`;
  csvContent += `Total Sessions,${data.summary.totalSessions}\n`;
  csvContent += `Total Queries,${data.summary.totalQueries}\n`;
  csvContent += `Average Session Length (minutes),${data.summary.avgSessionMinutes}\n\n`;
  
  // Add sessions data
  csvContent += 'Sessions\n';
  csvContent += 'Student Name,Date,Duration (minutes),Topic,Queries\n';
  
  data.sessions.forEach(session => {
    csvContent += `${session.userName || session.student_name || ''},`;
    csvContent += `${formatDate(session.startTime || session.session_date || '')},`;
    csvContent += `${session.duration_minutes || Math.floor((session.duration || 0) / 60)},`;
    csvContent += `${session.topicOrContent || session.topic_or_content_used || ''},`;
    csvContent += `${session.numQueries || session.queries || 0}\n`;
  });
  
  csvContent += '\nTopics\n';
  csvContent += 'Topic,Count\n';
  
  data.topics.forEach(topic => {
    csvContent += `${topic.topic},${topic.count}\n`;
  });
  
  csvContent += '\nStudy Time by Week\n';
  csvContent += 'Week,Hours\n';
  
  data.studyTime.forEach(item => {
    csvContent += `${item.week},${item.hours}\n`;
  });
  
  return csvContent;
};

/**
 * Format a date string for display
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (e) {
    return dateString;
  }
};

/**
 * Fetch student performance data
 */
export const fetchStudentPerformanceData = async (
  schoolId: string,
  dateRange?: DateRange,
  studentId?: string
): Promise<StudentPerformanceData[]> => {
  try {
    // Mock data for now - replace with real API call
    const mockData: StudentPerformanceData[] = [
      {
        id: '1',
        name: 'Alice Johnson',
        avg_score: 82,
        assessments_taken: 12,
        completion_rate: 92,
        last_active: '2025-05-02'
      },
      {
        id: '2',
        name: 'Bob Smith',
        avg_score: 75,
        assessments_taken: 10,
        completion_rate: 85,
        last_active: '2025-05-01'
      },
      {
        id: '3',
        name: 'Charlie Brown',
        avg_score: 90,
        assessments_taken: 15,
        completion_rate: 100,
        last_active: '2025-05-03'
      },
      {
        id: '4',
        name: 'Diana Prince',
        avg_score: 88,
        assessments_taken: 14,
        completion_rate: 95,
        last_active: '2025-05-04'
      },
      {
        id: '5',
        name: 'Ethan Hunt',
        avg_score: 79,
        assessments_taken: 11,
        completion_rate: 88,
        last_active: '2025-05-02'
      }
    ];
    
    // If studentId is provided, filter the data
    if (studentId) {
      return mockData.filter(student => student.id === studentId);
    }
    
    return mockData;
  } catch (error) {
    console.error('Error fetching student performance data:', error);
    throw error;
  }
};

/**
 * Fetch school performance metrics
 */
export const fetchSchoolPerformanceMetrics = async (
  schoolId: string,
  dateRange?: DateRange
): Promise<SchoolPerformanceData | null> => {
  try {
    // Mock data for now - replace with real API call
    return {
      school_id: schoolId,
      school_name: 'Demo School',
      total_assessments: 45,
      students_with_submissions: 28,
      total_students: 30,
      avg_submissions_per_assessment: 0.8,
      avg_score: 82.5,
      completion_rate: 92.3,
      student_participation_rate: 93.3
    };
  } catch (error) {
    console.error('Error fetching school performance metrics:', error);
    throw error;
  }
};

/**
 * Fetch teacher performance data
 */
export const fetchTeacherPerformanceData = async (
  schoolId: string,
  dateRange?: DateRange
): Promise<TeacherPerformanceData[]> => {
  try {
    // Mock data for now - replace with real API call
    const mockData: TeacherPerformanceData[] = [
      {
        teacher_id: '1',
        teacher_name: 'Ms. Johnson',
        assessments_created: 15,
        students_assessed: 28,
        avg_submissions_per_assessment: 0.85,
        avg_student_score: 84.2,
        completion_rate: 92.1
      },
      {
        teacher_id: '2',
        teacher_name: 'Mr. Smith',
        assessments_created: 12,
        students_assessed: 25,
        avg_submissions_per_assessment: 0.78,
        avg_student_score: 79.5,
        completion_rate: 88.3
      },
      {
        teacher_id: '3',
        teacher_name: 'Mrs. Brown',
        assessments_created: 18,
        students_assessed: 30,
        avg_submissions_per_assessment: 0.92,
        avg_student_score: 88.7,
        completion_rate: 95.2
      }
    ];
    
    return mockData;
  } catch (error) {
    console.error('Error fetching teacher performance data:', error);
    throw error;
  }
};
