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

/**
 * Formats a date range into a readable string.
 * @param dateRange - The date range object.
 * @returns A string representing the date range.
 */
export const getDateRangeText = (dateRange: { from?: Date; to?: Date }): string => {
  if (!dateRange.from && !dateRange.to) {
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
  try {
    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Generate mock analytics data for test users
      const mockData = getMockAnalyticsData(schoolId, filters);
      return mockData.summary;
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
      throw new Error('Failed to fetch analytics summary');
    }
    
    // Calculate analytics summary from the data
    const totalSessions = data.length;
    const totalQueries = data.reduce((sum, session) => sum + session.num_queries, 0);
    const activeStudents = new Set(data.map(session => session.user_id)).size;
    
    // Calculate average session duration in minutes
    const totalDuration = data.reduce((sum, session) => {
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
    
    // Return default values in case of an error
    return {
      activeStudents: 0,
      totalSessions: 0,
      totalQueries: 0,
      avgSessionMinutes: 0
    };
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
    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Generate mock analytics data for test users
      const mockData = getMockAnalyticsData(schoolId, filters);
      return mockData.sessions;
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
      throw new Error('Failed to fetch session logs');
    }
    
    // Format the data into SessionData objects
    const sessionLogs: SessionData[] = data.map(session => ({
      id: session.id,
      student: session.user_id, // Replace with actual student name if available
      topic: session.topic_or_content_used,
      queries: session.num_queries,
      duration: calculateDuration(session.session_start, session.session_end),
      startTime: session.session_start
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
    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Generate mock analytics data for test users
      const mockData = getMockAnalyticsData(schoolId, filters);
      return mockData.topics;
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
      throw new Error('Failed to fetch topic data');
    }
    
    // Count the occurrences of each topic
    const topicCounts: { [topic: string]: number } = {};
    data.forEach(session => {
      const topic = session.topic_or_content_used;
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
    
    // Convert the topic counts into TopicData objects
    const topicData: TopicData[] = Object.entries(topicCounts).map(([name, value]) => ({
      name,
      value
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
    // Check if the user is a test user
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // Generate mock analytics data for test users
      const mockData = getMockAnalyticsData(schoolId, filters);
      return mockData.studyTime;
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
      throw new Error('Failed to fetch study time data');
    }
    
    // Calculate the total study time for each student
    const studentStudyTime: { [studentId: string]: number } = {};
    data.forEach(session => {
      const studentId = session.user_id;
      const start = new Date(session.session_start).getTime();
      const end = new Date(session.session_end).getTime();
      studentStudyTime[studentId] = (studentStudyTime[studentId] || 0) + (end - start);
    });
    
    // Convert the student study time into StudyTimeData objects
    const studyTimeData: StudyTimeData[] = Object.entries(studentStudyTime).map(([name, hours]) => ({
      name, // Replace with actual student name if available
      hours: hours / (60 * 60 * 1000) // Convert milliseconds to hours
    }));
    
    return studyTimeData;
  } catch (error: any) {
    console.error('Error generating study time data:', error);
    return [];
  }
};

/**
 * Calculates the duration between two timestamps in a human-readable format.
 * @param start - The start timestamp.
 * @param end - The end timestamp.
 * @returns A string representing the duration in minutes and seconds.
 */
const calculateDuration = (start: string, end: string): string => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const duration = endTime - startTime;
  const minutes = Math.floor(duration / (60 * 1000));
  const seconds = Math.floor((duration % (60 * 1000)) / 1000);
  return `${minutes} min ${seconds} sec`;
};

// Add aliases for the functions used in AdminAnalytics.tsx
export const fetchAnalyticsSummary = getAnalyticsSummary;
export const fetchSessionLogs = getSessionLogs;
export const fetchTopics = getTopicData;
export const fetchStudyTime = getStudyTimeData;
