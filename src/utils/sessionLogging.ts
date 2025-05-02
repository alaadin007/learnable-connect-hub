
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, addMinutes } from 'date-fns';

// Interface for session data
interface SessionLogData {
  id: string;
  user_id: string;
  school_id: string;
  topic_or_content_used: string | null;
  num_queries: number;
  session_start: string;
  session_end: string | null;
}

// Function to generate mock session data for test accounts
export const generateMockSessionData = (
  userId: string,
  schoolId: string,
  daysBack: number = 30
): SessionLogData => {
  // Generate random topic
  const topics = [
    'Mathematics',
    'Science',
    'History',
    'English',
    'Geography',
    'Physics',
    'Chemistry',
    'Biology',
    'Literature',
    'Computer Science',
    null
  ];
  
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];
  
  // Generate random dates within the specified range
  const now = new Date();
  const startDate = subDays(now, Math.floor(Math.random() * daysBack));
  
  // Session duration between 10 and 60 minutes
  const sessionDuration = Math.floor(Math.random() * 50) + 10;
  const endDate = addMinutes(startDate, sessionDuration);
  
  // Random number of queries between 5 and 30
  const queryCount = Math.floor(Math.random() * 25) + 5;
  
  return {
    id: uuidv4(),
    user_id: userId,
    school_id: schoolId,
    topic_or_content_used: randomTopic,
    num_queries: queryCount,
    session_start: startDate.toISOString(),
    session_end: endDate.toISOString(),
  };
};

// Function to populate test account with mock session data
export const populateTestAccountWithSessions = async (
  userId: string,
  schoolId: string,
  sessionCount: number = 30
): Promise<boolean> => {
  try {
    // Generate multiple sessions
    const sessions: SessionLogData[] = [];
    
    for (let i = 0; i < sessionCount; i++) {
      const daysBack = Math.min(90, sessionCount); // Up to 90 days back
      sessions.push(generateMockSessionData(userId, schoolId, daysBack));
    }
    
    // For test accounts, directly insert the data into session_logs
    if (sessions.length > 0) {
      // Store in sessionStorage for local data access
      sessionStorage.setItem('mockSessionLogs', JSON.stringify(sessions));
      console.log(`Generated ${sessions.length} mock sessions for test account`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error populating test account with sessions:', error);
    return false;
  }
};

// Function to log the start of a session
export const logSessionStart = async (topic?: string): Promise<string | null> => {
  try {
    // Check if this is a test account
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType) {
      // For test accounts, generate a session ID and store in session storage
      const sessionId = uuidv4();
      const userId = JSON.parse(sessionStorage.getItem('testUser') || '{}')?.id;
      const schoolId = sessionStorage.getItem('testSchoolId');
      
      if (!userId || !schoolId) {
        throw new Error('Test user data not found in session storage');
      }
      
      // Create a new mock session
      const now = new Date();
      const mockSession = {
        id: sessionId,
        user_id: userId,
        school_id: schoolId,
        topic_or_content_used: topic || null,
        num_queries: 0,
        session_start: now.toISOString(),
        session_end: null
      };
      
      // Store the active session
      sessionStorage.setItem('activeSessionId', sessionId);
      sessionStorage.setItem('activeSession', JSON.stringify(mockSession));
      
      // Generate some mock session data for analytics if this is the first login
      if (!sessionStorage.getItem('mockSessionLogs')) {
        await populateTestAccountWithSessions(userId, schoolId);
      }
      
      return sessionId;
    }
    
    // For real users, call the Supabase function
    const { data, error } = await supabase.rpc('create_session_log', { topic });
    
    if (error) {
      console.error('Error starting session log:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in logSessionStart:', error);
    return null;
  }
};

// Function to update the session topic
export const updateSessionTopic = async (sessionId: string, topic: string): Promise<boolean> => {
  try {
    // Check if this is a test account
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType && sessionId === sessionStorage.getItem('activeSessionId')) {
      // Update the mock session data
      const activeSession = JSON.parse(sessionStorage.getItem('activeSession') || '{}');
      activeSession.topic_or_content_used = topic;
      sessionStorage.setItem('activeSession', JSON.stringify(activeSession));
      return true;
    }
    
    // For real users, call the Supabase function
    const { error } = await supabase.rpc('update_session_topic', {
      log_id: sessionId,
      topic
    });
    
    if (error) {
      console.error('Error updating session topic:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateSessionTopic:', error);
    return false;
  }
};

// Function to increment the query count for a session
export const incrementQueryCount = async (sessionId: string): Promise<boolean> => {
  try {
    // Check if this is a test account
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType && sessionId === sessionStorage.getItem('activeSessionId')) {
      // Update the mock session data
      const activeSession = JSON.parse(sessionStorage.getItem('activeSession') || '{}');
      activeSession.num_queries += 1;
      sessionStorage.setItem('activeSession', JSON.stringify(activeSession));
      return true;
    }
    
    // For real users, call the Supabase function
    const { error } = await supabase.rpc('increment_session_query_count', {
      log_id: sessionId
    });
    
    if (error) {
      console.error('Error incrementing query count:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in incrementQueryCount:', error);
    return false;
  }
};

// Function to log the end of a session
export const logSessionEnd = async (sessionId: string, performanceData?: any): Promise<boolean> => {
  try {
    // Check if this is a test account
    const testUserType = sessionStorage.getItem('testUserType');
    
    if (testUserType && sessionId === sessionStorage.getItem('activeSessionId')) {
      // Update the mock session data
      const activeSession = JSON.parse(sessionStorage.getItem('activeSession') || '{}');
      activeSession.session_end = new Date().toISOString();
      activeSession.performance_metric = performanceData;
      
      // Add this session to the mock logs
      const mockLogs = JSON.parse(sessionStorage.getItem('mockSessionLogs') || '[]');
      mockLogs.push(activeSession);
      sessionStorage.setItem('mockSessionLogs', JSON.stringify(mockLogs));
      
      // Clear the active session
      sessionStorage.removeItem('activeSessionId');
      sessionStorage.removeItem('activeSession');
      
      return true;
    }
    
    // For real users, call the Supabase function
    const { error } = await supabase.rpc('end_session_log', {
      log_id: sessionId,
      performance_data: performanceData
    });
    
    if (error) {
      console.error('Error ending session log:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in logSessionEnd:', error);
    return false;
  }
};

// Function to fetch mock analytics data for test accounts
export const getMockAnalyticsData = (schoolId: string, filters?: any) => {
  // Retrieve the mock session logs
  const mockLogs = JSON.parse(sessionStorage.getItem('mockSessionLogs') || '[]');
  if (!mockLogs.length) return null;
  
  // Calculate summary statistics
  const studentsSet = new Set(mockLogs.map((log: SessionLogData) => log.user_id));
  
  // Create a filtered set of logs based on date range if provided
  let filteredLogs = [...mockLogs];
  if (filters?.dateRange?.from) {
    const fromDate = new Date(filters.dateRange.from);
    filteredLogs = filteredLogs.filter((log: SessionLogData) => 
      new Date(log.session_start) >= fromDate
    );
  }
  if (filters?.dateRange?.to) {
    const toDate = new Date(filters.dateRange.to);
    toDate.setHours(23, 59, 59, 999); // End of the day
    filteredLogs = filteredLogs.filter((log: SessionLogData) => 
      new Date(log.session_start) <= toDate
    );
  }
  
  // Calculate average session length
  let totalSessionMinutes = 0;
  filteredLogs.forEach((log: SessionLogData) => {
    if (log.session_end) {
      const start = new Date(log.session_start);
      const end = new Date(log.session_end);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      totalSessionMinutes += durationMinutes;
    }
  });
  
  // Calculate total queries
  const totalQueries = filteredLogs.reduce((sum: number, log: SessionLogData) => 
    sum + log.num_queries, 0
  );
  
  // Return analytics data
  return {
    summary: {
      activeStudents: studentsSet.size,
      totalSessions: filteredLogs.length,
      totalQueries: totalQueries,
      avgSessionMinutes: filteredLogs.length > 0 ? totalSessionMinutes / filteredLogs.length : 0
    },
    sessions: filteredLogs.map((log: SessionLogData) => {
      // Calculate session duration
      let duration = '0 min';
      if (log.session_end) {
        const start = new Date(log.session_start);
        const end = new Date(log.session_end);
        const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        duration = `${durationMinutes} min`;
      }
      
      return {
        id: log.id,
        student: `Student ${log.user_id.substring(0, 5)}`,
        topic: log.topic_or_content_used || 'General',
        queries: log.num_queries,
        duration,
        startTime: log.session_start
      };
    }),
    topics: getTopicCounts(filteredLogs),
    studyTime: getStudyTimeCounts(filteredLogs)
  };
};

// Helper function to count topics
const getTopicCounts = (logs: SessionLogData[]) => {
  const topicCounts: {[key: string]: number} = {};
  
  logs.forEach((log: SessionLogData) => {
    const topic = log.topic_or_content_used || 'General';
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });
  
  // Convert to array format
  return Object.entries(topicCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
};

// Helper function to calculate study time by user
const getStudyTimeCounts = (logs: SessionLogData[]) => {
  const userStudyTime: {[key: string]: number} = {};
  
  logs.forEach((log: SessionLogData) => {
    if (log.session_end) {
      const start = new Date(log.session_start);
      const end = new Date(log.session_end);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      const userId = log.user_id;
      userStudyTime[userId] = (userStudyTime[userId] || 0) + durationHours;
    }
  });
  
  // Convert to array format with truncated user ids for display
  return Object.entries(userStudyTime)
    .map(([userId, hours]) => ({
      name: `Student ${userId.substring(0, 5)}`,
      hours: parseFloat(hours.toFixed(2))
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);
};
