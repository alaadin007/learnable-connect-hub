import { 
  AnalyticsFilters, 
  AnalyticsSummary, 
  SessionData, 
  StudyTimeData, 
  TopicData 
} from '@/components/analytics/types';
import { supabase } from '@/integrations/supabase/client';
import { getMockAnalyticsData } from '@/utils/sessionLogging';
import { format } from 'date-fns';

// SchoolPerformance interfaces
export interface SchoolPerformanceData {
  month: string;
  avg_monthly_score: number;
  monthly_completion_rate: number;
  score_improvement_rate: number;
  completion_improvement_rate: number;
}

export interface SchoolPerformanceSummary {
  total_assessments: number;
  students_with_submissions: number;
  total_students: number;
  avg_submissions_per_assessment: number;
  avg_score: number;
  completion_rate: number;
  student_participation_rate: number;
}

// TeacherPerformance interface
export interface TeacherPerformanceData {
  teacher_id: string;
  teacher_name: string;
  assessments_created: number;
  students_assessed: number;
  avg_submissions_per_assessment: number;
  avg_student_score: number;
  completion_rate: number;
}

// StudentPerformance interface
export interface StudentPerformanceData {
  student_id: string;
  student_name: string;
  assessments_taken: number;
  avg_score: number;
  avg_time_spent_seconds: number;
  assessments_completed: number;
  completion_rate: number;
  top_strengths: string;
  top_weaknesses: string;
}

/**
 * Formats a date range into a readable string.
 * @param dateRange - The date range object.
 * @returns A string representing the date range.
 */
export const getDateRangeText = (dateRange: { from?: Date; to?: Date }): string => {
  if (!dateRange?.from && !dateRange?.to) {
    return 'All Time';
  }
  
  const fromText = dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Start';
  const toText = dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'Present';
  
  return `${fromText} to ${toText}`;
};

/**
 * Retrieves analytics summary data based on the provided filters.
 * @param schoolId - The ID of the school.
 * @param filters - The filters to apply to the data.
 * @returns A promise that resolves to an AnalyticsSummary object.
 */
export const getAnalyticsSummary = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<AnalyticsSummary> => {
  // Default summary object to return in case of errors or no data
  const defaultSummary: AnalyticsSummary = {
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  };

  try {
    // Check if schoolId is valid
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
      console.warn('Invalid schoolId provided to getAnalyticsSummary:', schoolId);
      return defaultSummary;
    }

    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Generate mock analytics data for test users
      try {
        const mockData = getMockAnalyticsData(schoolId, filters);
        return mockData.summary || defaultSummary;
      } catch (error) {
        console.error('Error generating mock analytics data:', error);
        return defaultSummary;
      }
    }
    
    // Fetch analytics summary data from the database
    let query = supabase
      .from('session_logs')
      .select('*')
      .eq('school_id', schoolId);
    
    // Apply date range filter
    if (filters.dateRange?.from) {
      query = query.gte('session_start', filters.dateRange.from.toISOString());
    }
    if (filters.dateRange?.to) {
      const endDate = new Date(filters.dateRange.to);
      endDate.setDate(endDate.getDate() + 1); // Include the end date
      query = query.lte('session_start', endDate.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching analytics summary:', error);
      return defaultSummary;
    }
    
    // Ensure data is an array before processing
    if (!Array.isArray(data)) {
      console.warn('Data returned from query is not an array:', data);
      return defaultSummary;
    }
    
    // Calculate analytics summary from the data
    const totalSessions = data.length;
    const totalQueries = data.reduce((sum, session) => sum + (session.num_queries || 0), 0);
    const activeStudents = new Set(data.map(session => session.user_id)).size;
    
    // Calculate average session duration in minutes
    const totalDuration = data.reduce((sum, session) => {
      if (!session.session_start || !session.session_end) return sum;
      const start = new Date(session.session_start).getTime();
      const end = new Date(session.session_end).getTime();
      return sum + (end - start);
    }, 0);
    
    const avgSessionMinutes = totalSessions > 0 ? (totalDuration / (totalSessions * 60 * 1000)) : 0;
    
    return {
      activeStudents,
      totalSessions,
      totalQueries,
      avgSessionMinutes
    };
  } catch (error: any) {
    console.error('Error generating analytics summary:', error);
    return defaultSummary;
  }
};

/**
 * Retrieves session logs based on the provided filters.
 * @param schoolId - The ID of the school.
 * @param filters - The filters to apply to the data.
 * @returns A promise that resolves to an array of SessionData objects.
 */
export const getSessionLogs = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<SessionData[]> => {
  try {
    // Check if schoolId is valid
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
      console.warn('Invalid schoolId provided to getSessionLogs:', schoolId);
      return [];
    }

    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Generate mock analytics data for test users
      try {
        const mockData = getMockAnalyticsData(schoolId, filters);
        if (!mockData.sessions || !Array.isArray(mockData.sessions)) {
          return [];
        }
        
        return mockData.sessions.map(session => ({
          id: session.id || `mock-${Math.random().toString(36).substr(2, 9)}`,
          userId: session.student || "",
          userName: session.student || "",
          topicOrContent: session.topic || "",
          startTime: session.startTime || "",
          endTime: null,
          duration: session.duration || "N/A",
          numQueries: session.queries || 0,
          // Keep original properties for backward compatibility
          student: session.student || "",
          topic: session.topic || "",
          queries: session.queries || 0
        }));
      } catch (error) {
        console.error('Error generating mock session logs:', error);
        return [];
      }
    }
    
    // Fetch session logs from the database
    let query = supabase
      .from('session_logs')
      .select('*')
      .eq('school_id', schoolId);
    
    // Apply date range filter
    if (filters.dateRange?.from) {
      query = query.gte('session_start', filters.dateRange.from.toISOString());
    }
    if (filters.dateRange?.to) {
      const endDate = new Date(filters.dateRange.to);
      endDate.setDate(endDate.getDate() + 1); // Include the end date
      query = query.lte('session_start', endDate.toISOString());
    }
    
    // Apply student filter
    if (filters.studentId) {
      query = query.eq('user_id', filters.studentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching session logs:', error);
      return [];
    }
    
    // Ensure data is an array before mapping
    if (!Array.isArray(data)) {
      return [];
    }
    
    // Format the data into SessionData objects
    const sessionLogs: SessionData[] = data.map(session => ({
      id: session.id || `db-${Math.random().toString(36).substr(2, 9)}`,
      userId: session.user_id || "",
      userName: session.user_id || "", // Replace with actual student name if available
      topicOrContent: session.topic_or_content_used || "",
      startTime: session.session_start || "",
      endTime: session.session_end || "",
      duration: calculateDuration(session.session_start || "", session.session_end || ""),
      numQueries: session.num_queries || 0,
      // Keep original properties for backward compatibility
      student: session.user_id || "",
      topic: session.topic_or_content_used || "",
      queries: session.num_queries || 0
    }));
    
    return sessionLogs;
  } catch (error: any) {
    console.error('Error generating session logs:', error);
    return [];
  }
};

/**
 * Retrieves topic data based on the provided school ID and filters.
 * @param schoolId - The ID of the school.
 * @param filters - The filters to apply to the data.
 * @returns A promise that resolves to an array of TopicData objects.
 */
export const getTopicData = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<TopicData[]> => {
  try {
    // Check if schoolId is valid
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
      console.warn('Invalid schoolId provided to getTopicData:', schoolId);
      return [];
    }

    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Generate mock analytics data for test users
      try {
        const mockData = getMockAnalyticsData(schoolId, filters);
        if (!mockData.topics || !Array.isArray(mockData.topics)) {
          return [];
        }
        
        return mockData.topics.map(topic => ({
          topic: topic.name || "",
          count: topic.value || 0,
          // Keep original properties for backward compatibility
          name: topic.name || "",
          value: topic.value || 0
        }));
      } catch (error) {
        console.error('Error generating mock topic data:', error);
        return [];
      }
    }
    
    // Fetch topic data from the database
    let query = supabase
      .from('session_logs')
      .select('topic_or_content_used')
      .eq('school_id', schoolId);
    
    // Apply date range filter
    if (filters.dateRange?.from) {
      query = query.gte('session_start', filters.dateRange.from.toISOString());
    }
    if (filters.dateRange?.to) {
      const endDate = new Date(filters.dateRange.to);
      endDate.setDate(endDate.getDate() + 1); // Include the end date
      query = query.lte('session_start', endDate.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching topic data:', error);
      return [];
    }
    
    // Ensure data is an array before processing
    if (!Array.isArray(data)) {
      return [];
    }
    
    // Count the occurrences of each topic
    const topicCounts: { [topic: string]: number } = {};
    data.forEach(session => {
      const topic = session.topic_or_content_used || 'General';
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
    
    // Convert the topic counts into TopicData objects
    const topicData: TopicData[] = Object.entries(topicCounts).map(([topicName, count]) => ({
      topic: topicName,
      count: count,
      // Keep original properties for backward compatibility
      name: topicName,
      value: count
    }));
    
    return topicData;
  } catch (error: any) {
    console.error('Error generating topic data:', error);
    return [];
  }
};

/**
 * Retrieves study time data based on the provided school ID and filters.
 * @param schoolId - The ID of the school.
 * @param filters - The filters to apply to the data.
 * @returns A promise that resolves to an array of StudyTimeData objects.
 */
export const getStudyTimeData = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<StudyTimeData[]> => {
  try {
    // Check if schoolId is valid
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
      console.warn('Invalid schoolId provided to getStudyTimeData:', schoolId);
      return [];
    }

    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Generate mock analytics data for test users
      try {
        const mockData = getMockAnalyticsData(schoolId, filters);
        if (!mockData.studyTime || !Array.isArray(mockData.studyTime)) {
          return [];
        }
        
        return mockData.studyTime.map(item => ({
          week: new Date().getWeek(),
          year: new Date().getFullYear(),
          hours: item.hours || 0,
          studentName: item.name || "",
          // Keep original properties for backward compatibility
          name: item.name || ""
        }));
      } catch (error) {
        console.error('Error generating mock study time data:', error);
        return [];
      }
    }
    
    // Fetch study time data from the database
    let query = supabase
      .from('session_logs')
      .select('user_id, session_start, session_end')
      .eq('school_id', schoolId);
    
    // Apply date range filter
    if (filters.dateRange?.from) {
      query = query.gte('session_start', filters.dateRange.from.toISOString());
    }
    if (filters.dateRange?.to) {
      const endDate = new Date(filters.dateRange.to);
      endDate.setDate(endDate.getDate() + 1); // Include the end date
      query = query.lte('session_start', endDate.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching study time data:', error);
      return [];
    }
    
    // Ensure data is an array before processing
    if (!Array.isArray(data)) {
      return [];
    }
    
    // Calculate the total study time for each student
    const studentStudyTime: { [studentId: string]: number } = {};
    data.forEach(session => {
      if (!session.session_start || !session.session_end) return;
      const studentId = session.user_id || "unknown";
      const start = new Date(session.session_start).getTime();
      const end = new Date(session.session_end).getTime();
      studentStudyTime[studentId] = (studentStudyTime[studentId] || 0) + (end - start);
    });
    
    // Convert the student study time into StudyTimeData objects
    const studyTimeData: StudyTimeData[] = Object.entries(studentStudyTime).map(([studentName, hours]) => ({
      week: new Date().getWeek(),
      year: new Date().getFullYear(),
      hours: hours / (60 * 60 * 1000), // Convert milliseconds to hours
      studentName: studentName, // Replace with actual student name if available
      // Keep original properties for backward compatibility
      name: studentName
    }));
    
    return studyTimeData;
  } catch (error: any) {
    console.error('Error generating study time data:', error);
    return [];
  }
};

// Add a helper method to Date prototype to get the current week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function(): number {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

/**
 * Calculates the duration between two timestamps in a human-readable format.
 * @param start - The start timestamp.
 * @param end - The end timestamp.
 * @returns A string representing the duration in minutes and seconds.
 */
const calculateDuration = (start: string, end: string): string => {
  if (!start || !end) return "N/A";
  
  try {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    
    if (isNaN(startTime) || isNaN(endTime)) {
      return "N/A";
    }
    
    const duration = endTime - startTime;
    if (duration <= 0) {
      return "0 min 0 sec";
    }
    
    const minutes = Math.floor(duration / (60 * 1000));
    const seconds = Math.floor((duration % (60 * 1000)) / 1000);
    return `${minutes} min ${seconds} sec`;
  } catch (error) {
    console.error("Error calculating duration:", error);
    return "N/A";
  }
};

/**
 * Retrieves school performance data for the given school ID.
 * @param schoolId - The ID of the school.
 * @param filters - The filters to apply to the data.
 * @returns A promise that resolves to an object containing school performance metrics.
 */
export const getSchoolPerformance = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<{ summary: SchoolPerformanceSummary | null; monthlyData: SchoolPerformanceData[] }> => {
  try {
    // Check if schoolId is valid
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
      console.warn('Invalid schoolId provided to getSchoolPerformance:', schoolId);
      return { summary: null, monthlyData: [] };
    }

    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Return mock data for test users
      return {
        summary: {
          total_assessments: 25,
          students_with_submissions: 42,
          total_students: 50,
          avg_submissions_per_assessment: 8.5,
          avg_score: 78.3,
          completion_rate: 85.2,
          student_participation_rate: 84.0
        },
        monthlyData: [
          {
            month: '2025-01-01',
            avg_monthly_score: 75.2,
            monthly_completion_rate: 80.1,
            score_improvement_rate: 0,
            completion_improvement_rate: 0
          },
          {
            month: '2025-02-01',
            avg_monthly_score: 76.5,
            monthly_completion_rate: 82.4,
            score_improvement_rate: 1.7,
            completion_improvement_rate: 2.9
          },
          {
            month: '2025-03-01',
            avg_monthly_score: 78.1,
            monthly_completion_rate: 84.5,
            score_improvement_rate: 2.1,
            completion_improvement_rate: 2.5
          },
          {
            month: '2025-04-01',
            avg_monthly_score: 78.3,
            monthly_completion_rate: 85.2,
            score_improvement_rate: 0.3,
            completion_improvement_rate: 0.8
          }
        ]
      };
    }
    
    // Prepare date parameters
    const fromDate = filters.dateRange?.from?.toISOString();
    const toDate = filters.dateRange?.to?.toISOString();
    
    // Get school performance summary
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'get_school_performance_metrics',
      {
        p_school_id: schoolId,
        p_start_date: fromDate || null,
        p_end_date: toDate || null
      }
    );
    
    if (summaryError) {
      console.error('Error fetching school performance summary:', summaryError);
      return { summary: null, monthlyData: [] };
    }
    
    // Get monthly improvement data
    const { data: monthlyData, error: monthlyError } = await supabase.rpc(
      'get_school_improvement_metrics',
      {
        p_school_id: schoolId,
        p_months_to_include: 6
      }
    );
    
    if (monthlyError) {
      console.error('Error fetching school monthly performance:', monthlyError);
      return { summary: summaryData?.length > 0 ? summaryData[0] : null, monthlyData: [] };
    }
    
    return {
      summary: Array.isArray(summaryData) && summaryData.length > 0 ? summaryData[0] : null,
      monthlyData: Array.isArray(monthlyData) ? monthlyData : []
    };
  } catch (error: any) {
    console.error('Error generating school performance data:', error);
    return { summary: null, monthlyData: [] };
  }
};

/**
 * Retrieves teacher performance data based on the provided filters.
 * @param schoolId - The ID of the school.
 * @param filters - The filters to apply to the data.
 * @returns A promise that resolves to an array of TeacherPerformanceData objects.
 */
export const getTeacherPerformance = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<TeacherPerformanceData[]> => {
  try {
    // Check if schoolId is valid
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
      console.warn('Invalid schoolId provided to getTeacherPerformance:', schoolId);
      return [];
    }
    
    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Return mock data for test users
      return [
        {
          teacher_id: "1",
          teacher_name: "John Smith",
          assessments_created: 15,
          students_assessed: 48,
          avg_submissions_per_assessment: 9.2,
          avg_student_score: 81.5,
          completion_rate: 88.3
        },
        {
          teacher_id: "2",
          teacher_name: "Maria Johnson",
          assessments_created: 12,
          students_assessed: 42,
          avg_submissions_per_assessment: 8.7,
          avg_student_score: 76.2,
          completion_rate: 84.1
        },
        {
          teacher_id: "3",
          teacher_name: "Robert Brown",
          assessments_created: 8,
          students_assessed: 37,
          avg_submissions_per_assessment: 7.8,
          avg_student_score: 72.9,
          completion_rate: 79.5
        }
      ];
    }
    
    // Prepare date parameters
    const fromDate = filters.dateRange?.from?.toISOString();
    const toDate = filters.dateRange?.to?.toISOString();
    
    // Filter by specific teacher if provided
    const teacherId = filters.teacherId;
    
    // Get teacher performance data
    const { data: teacherData, error } = await supabase.rpc(
      'get_teacher_performance_metrics',
      {
        p_school_id: schoolId,
        p_start_date: fromDate || null,
        p_end_date: toDate || null
      }
    );
    
    if (error) {
      console.error('Error fetching teacher performance data:', error);
      return [];
    }
    
    // Filter by teacher ID if provided and ensure we return an array
    let filteredData: TeacherPerformanceData[] = Array.isArray(teacherData) ? teacherData : [];
    
    if (teacherId && filteredData.length > 0) {
      filteredData = filteredData.filter(teacher => teacher.teacher_id === teacherId);
    }
    
    return filteredData;
  } catch (error: any) {
    console.error('Error generating teacher performance data:', error);
    return [];
  }
};

/**
 * Retrieves student performance data based on the provided filters.
 * @param schoolId - The ID of the school.
 * @param filters - The filters to apply to the data.
 * @returns A promise that resolves to an array of StudentPerformanceData objects.
 */
export const getStudentPerformance = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<StudentPerformanceData[]> => {
  try {
    // Check if schoolId is valid
    if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
      console.warn('Invalid schoolId provided to getStudentPerformance:', schoolId);
      return [];
    }

    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Return mock data for test users
      return [
        {
          student_id: "1",
          student_name: "Alice Thompson",
          assessments_taken: 8,
          assessments_completed: 7,
          avg_score: 92.5,
          avg_time_spent_seconds: 1245,
          completion_rate: 87.5,
          top_strengths: "Critical thinking, Problem solving",
          top_weaknesses: "Time management"
        },
        {
          student_id: "2",
          student_name: "Bob Wilson",
          assessments_taken: 8,
          assessments_completed: 6,
          avg_score: 84.3,
          avg_time_spent_seconds: 1532,
          completion_rate: 75.0,
          top_strengths: "Data analysis, Research",
          top_weaknesses: "Written communication"
        },
        {
          student_id: "3",
          student_name: "Charlie Davis",
          assessments_taken: 8,
          assessments_completed: 8,
          avg_score: 78.9,
          avg_time_spent_seconds: 1876,
          completion_rate: 100.0,
          top_strengths: "Teamwork, Creativity",
          top_weaknesses: "Mathematical concepts"
        }
      ];
    }
    
    // Prepare date parameters
    const fromDate = filters.dateRange?.from?.toISOString();
    const toDate = filters.dateRange?.to?.toISOString();
    
    // Filter by specific student if provided
    const studentId = filters.studentId;
    
    // Get student performance data
    const { data: studentData, error } = await supabase.rpc(
      'get_student_performance_metrics',
      {
        p_school_id: schoolId,
        p_start_date: fromDate || null,
        p_end_date: toDate || null
      }
    );
    
    if (error) {
      console.error('Error fetching student performance data:', error);
      return [];
    }
    
    // Filter by student ID if provided and ensure we return an array
    let filteredData: StudentPerformanceData[] = Array.isArray(studentData) ? studentData : [];
    
    if (studentId && filteredData.length > 0) {
      filteredData = filteredData.filter(student => student.student_id === studentId);
    }
    
    return filteredData;
  } catch (error: any) {
    console.error('Error generating student performance data:', error);
    return [];
  }
};

// Add aliases for the functions used in AdminAnalytics.tsx
export const fetchAnalyticsSummary = getAnalyticsSummary;
export const fetchSessionLogs = getSessionLogs;
export const fetchTopics = getTopicData;
export const fetchStudyTime = getStudyTimeData;
export const fetchSchoolPerformance = getSchoolPerformance;
export const fetchTeacherPerformance = getTeacherPerformance;
export const fetchStudentPerformance = getStudentPerformance;
