// Add this at the top of the file if needed
import { supabase } from "@/integrations/supabase/client";
import { format, getWeek } from 'date-fns';

// Helper function for getting week number if not using date-fns getWeek
// This extends the Date prototype to add the getWeek method
interface Date {
  getWeek(): number;
}

// Implement getWeek on Date prototype
Date.prototype.getWeek = function() {
  var date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1.
  var week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                        - 3 + (week1.getDay() + 6) % 7) / 7);
};

// Add these functions that are being imported by sessionLogger.ts
export const logSessionStart = async (topic?: string, userId?: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-session-log', {
      body: { topic, userId }
    });
    
    if (error) {
      console.error('Error starting session:', error);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('Error starting session:', e);
    return null;
  }
};

export const logSessionEnd = async (logId: string, performanceData?: any) => {
  try {
    const { error } = await supabase.functions.invoke('end-session', {
      body: { 
        logId, 
        performanceData 
      }
    });
    
    if (error) {
      console.error('Error ending session:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Error ending session:', e);
    return false;
  }
};

export const updateSessionTopic = async (logId: string, topic: string) => {
  try {
    const { error } = await supabase.functions.invoke('update-session', {
      body: { 
        logId, 
        topic 
      }
    });
    
    if (error) {
      console.error('Error updating session topic:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Error updating session topic:', e);
    return false;
  }
};

export const incrementQueryCount = async (logId: string) => {
  try {
    const { error } = await supabase.rpc('increment_session_query_count', { log_id: logId });
    
    if (error) {
      console.error('Error incrementing query count:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Error incrementing query count:', e);
    return false;
  }
};

// Add this function referenced in AuthContext.tsx
export const populateTestAccountWithSessions = async (userId: string, schoolId: string, numSessions = 10) => {
  try {
    const { error } = await supabase.rpc('populatetestaccountwithsessions', { 
      userid: userId,
      schoolid: schoolId,
      num_sessions: numSessions
    });
    
    if (error) {
      console.error('Error populating test account with sessions:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Error populating test account with sessions:', e);
    return false;
  }
};

interface MockSession {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime: string | null;
  duration: string | number;
  topicOrContent: string;
  numQueries: number;
  queries: number;
}

interface MockTopic {
  topic: string;
  name: string;
  count: number;
  value: number;
}

interface MockStudyTime {
  studentName: string;
  name: string;
  hours: number;
  week: number;
  year: number;
}

interface MockAnalyticsData {
  summary: {
    activeStudents: number;
    totalSessions: number;
    totalQueries: number;
    avgSessionMinutes: number;
  };
  sessions: MockSession[];
  topics: MockTopic[];
  studyTime: MockStudyTime[];
}

export const getMockAnalyticsData = (schoolId: string, filters: any): MockAnalyticsData => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentWeek = getWeek(today); // Using date-fns getWeek here

  const sessions: MockSession[] = [
    {
      id: '1',
      userId: '101',
      userName: 'Alice',
      startTime: format(today, 'yyyy-MM-dd HH:mm:ss'),
      endTime: format(today, 'yyyy-MM-dd HH:mm:ss'),
      duration: '35',
      topicOrContent: 'Math',
      numQueries: 5,
      queries: 5,
    },
    {
      id: '2',
      userId: '102',
      userName: 'Bob',
      startTime: format(today, 'yyyy-MM-dd HH:mm:ss'),
      endTime: format(today, 'yyyy-MM-dd HH:mm:ss'),
      duration: '42',
      topicOrContent: 'Science',
      numQueries: 7,
      queries: 7,
    },
    {
      id: '3',
      userId: '101',
      userName: 'Alice',
      startTime: format(today, 'yyyy-MM-dd HH:mm:ss'),
      endTime: format(today, 'yyyy-MM-dd HH:mm:ss'),
      duration: '28',
      topicOrContent: 'History',
      numQueries: 3,
      queries: 3,
    },
  ];

  const topics: MockTopic[] = [
    { topic: 'Math', name: 'Math', count: 15, value: 15 },
    { topic: 'Science', name: 'Science', count: 12, value: 12 },
    { topic: 'History', name: 'History', count: 8, value: 8 },
  ];

  const studyTime: MockStudyTime[] = [
    { studentName: 'Alice', name: 'Alice', hours: 5, week: currentWeek, year: currentYear },
    { studentName: 'Bob', name: 'Bob', hours: 7, week: currentWeek, year: currentYear },
    { studentName: 'Charlie', name: 'Charlie', hours: 3, week: currentWeek, year: currentYear },
  ];

  const summary = {
    activeStudents: 3,
    totalSessions: sessions.length,
    totalQueries: sessions.reduce((sum, session) => sum + session.numQueries, 0),
    avgSessionMinutes: sessions.reduce((sum, session) => sum + Number(session.duration), 0) / sessions.length,
  };

  return { summary, sessions, topics, studyTime };
};
