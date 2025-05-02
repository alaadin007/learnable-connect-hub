
// Import necessary libraries and clients
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { 
  AnalyticsFilters, 
  AnalyticsSummary, 
  TopicData, 
  StudyTimeData,
  SessionData
} from '@/components/analytics/types';

/**
 * Starts a new learning session
 * @param userId - The ID of the user
 * @param schoolId - The ID of the school
 * @returns The session ID or null if failed
 */
export const logSessionStart = async (userId: string, schoolId: string): Promise<string | null> => {
  try {
    // For test accounts, store session in session storage
    if (sessionStorage.getItem('testUserType')) {
      const sessionId = uuidv4();
      const sessionData = {
        id: sessionId,
        user_id: userId,
        school_id: schoolId,
        session_start: new Date().toISOString(),
        num_queries: 0
      };
      sessionStorage.setItem('activeSessionId', sessionId);
      sessionStorage.setItem('sessionData', JSON.stringify(sessionData));
      return sessionId;
    }
    
    // For real accounts, call edge function to create session
    const { data, error } = await supabase.functions.invoke('create-session-log', {
      body: { user_id: userId, school_id: schoolId }
    });
    
    if (error) {
      console.error('Error starting session:', error);
      return null;
    }
    
    // Store session ID in session storage for reference
    if (data?.session_id) {
      sessionStorage.setItem('activeSessionId', data.session_id);
      return data.session_id;
    }
    
    return null;
  } catch (error) {
    console.error('Exception starting session:', error);
    return null;
  }
};

/**
 * Ends an active learning session
 * @param sessionId - The ID of the session to end
 * @returns Whether the operation was successful
 */
export const logSessionEnd = async (sessionId?: string): Promise<boolean> => {
  try {
    // Use provided session ID or get from storage
    const activeSessionId = sessionId || sessionStorage.getItem('activeSessionId');
    
    if (!activeSessionId) {
      console.error('No active session to end');
      return false;
    }
    
    // For test accounts, just update session storage
    if (sessionStorage.getItem('testUserType')) {
      const sessionData = JSON.parse(sessionStorage.getItem('sessionData') || '{}');
      sessionData.session_end = new Date().toISOString();
      sessionStorage.setItem('sessionData', JSON.stringify(sessionData));
      sessionStorage.removeItem('activeSessionId');
      return true;
    }
    
    // For real accounts, call edge function to end session
    const { error } = await supabase.functions.invoke('end-session', {
      body: { session_id: activeSessionId }
    });
    
    if (error) {
      console.error('Error ending session:', error);
      return false;
    }
    
    // Clear session from storage
    sessionStorage.removeItem('activeSessionId');
    return true;
  } catch (error) {
    console.error('Exception ending session:', error);
    return false;
  }
};

/**
 * Updates the topic for an active session
 * @param topic - The topic to set for the session
 * @param sessionId - The ID of the session (optional, will use active session if not provided)
 * @returns Whether the operation was successful
 */
export const updateSessionTopic = async (topic: string, sessionId?: string): Promise<boolean> => {
  try {
    // Use provided session ID or get from storage
    const activeSessionId = sessionId || sessionStorage.getItem('activeSessionId');
    
    if (!activeSessionId) {
      console.error('No active session to update topic');
      return false;
    }
    
    // For test accounts, just update session storage
    if (sessionStorage.getItem('testUserType')) {
      const sessionData = JSON.parse(sessionStorage.getItem('sessionData') || '{}');
      sessionData.topic_or_content_used = topic;
      sessionStorage.setItem('sessionData', JSON.stringify(sessionData));
      return true;
    }
    
    // For real accounts, call edge function to update session topic
    const { error } = await supabase.functions.invoke('update-session', {
      body: { log_id: activeSessionId, topic }
    });
    
    if (error) {
      console.error('Error updating session topic:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception updating session topic:', error);
    return false;
  }
};

/**
 * Increments the query count for an active session
 * @param sessionId - The ID of the session (optional, will use active session if not provided)
 * @returns Whether the operation was successful
 */
export const incrementQueryCount = async (sessionId?: string): Promise<boolean> => {
  try {
    // Use provided session ID or get from storage
    const activeSessionId = sessionId || sessionStorage.getItem('activeSessionId');
    
    if (!activeSessionId) {
      console.error('No active session to increment query count');
      return false;
    }
    
    // For test accounts, just update session storage
    if (sessionStorage.getItem('testUserType')) {
      const sessionData = JSON.parse(sessionStorage.getItem('sessionData') || '{}');
      sessionData.num_queries = (sessionData.num_queries || 0) + 1;
      sessionStorage.setItem('sessionData', JSON.stringify(sessionData));
      return true;
    }
    
    // For real accounts, call edge function to increment query count
    const { error } = await supabase.functions.invoke('update-session', {
      body: { log_id: activeSessionId, action: 'increment_query' }
    });
    
    if (error) {
      console.error('Error incrementing query count:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception incrementing query count:', error);
    return false;
  }
};

/**
 * Generates mock analytics data for test accounts
 * @param schoolId - The ID of the school
 * @param filters - The filters to apply
 * @returns Mock analytics data
 */
export const getMockAnalyticsData = (
  schoolId: string,
  filters: AnalyticsFilters
) => {
  // Mock summary data
  const summary: AnalyticsSummary = {
    activeStudents: 24,
    totalSessions: 187,
    totalQueries: 856,
    avgSessionMinutes: 22
  };
  
  // Generate mock session data
  const sessions: SessionData[] = [];
  const studentNames = [
    "Emma Thompson",
    "Liam Johnson",
    "Olivia Davis",
    "Noah Wilson",
    "Ava Martinez",
    "Sophia Brown",
    "Jackson Lee",
    "Isabella Taylor",
    "Lucas Garcia",
    "Mia Robinson"
  ];
  
  const topics = [
    "Algebra",
    "Geometry",
    "Calculus",
    "Biology",
    "Chemistry",
    "Physics",
    "American History",
    "World History",
    "Literature",
    "Grammar",
  ];
  
  // Generate random sessions
  const now = new Date();
  for (let i = 0; i < 20; i++) {
    const randomDaysAgo = Math.floor(Math.random() * 30);
    const sessionDate = new Date(now);
    sessionDate.setDate(sessionDate.getDate() - randomDaysAgo);
    
    sessions.push({
      id: `sess-${i}-${uuidv4().substring(0, 8)}`,
      student: studentNames[Math.floor(Math.random() * studentNames.length)],
      topic: topics[Math.floor(Math.random() * topics.length)],
      queries: Math.floor(Math.random() * 15) + 3,
      duration: `${Math.floor(Math.random() * 30) + 5} min`,
      startTime: sessionDate.toISOString(),
    });
  }
  
  // Generate topics data
  const topicsData: TopicData[] = topics.map((topic, index) => ({
    name: topic,
    value: Math.floor(Math.random() * 50) + 10,
  }));
  
  // Generate study time data
  const studyTime: StudyTimeData[] = studentNames.slice(0, 8).map((name, index) => ({
    name,
    hours: Math.floor(Math.random() * 10) + 2,
  }));
  
  // Apply filters if needed
  let filteredSessions = [...sessions];
  
  // Apply date range filter
  if (filters.dateRange?.from || filters.dateRange?.to) {
    filteredSessions = filteredSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      
      if (filters.dateRange.from && sessionDate < filters.dateRange.from) {
        return false;
      }
      
      if (filters.dateRange.to) {
        const endDate = new Date(filters.dateRange.to);
        endDate.setDate(endDate.getDate() + 1); // Include the end date
        if (sessionDate > endDate) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  // Apply student filter
  if (filters.studentId) {
    const studentName = studentNames.find((_, i) => i === parseInt(filters.studentId || "0"));
    filteredSessions = filteredSessions.filter(s => s.student === studentName);
  }
  
  return {
    summary,
    sessions: filteredSessions,
    topics: topicsData,
    studyTime
  };
};

/**
 * Populates test accounts with sample session data
 * @param studentId - The ID of the student
 * @param schoolId - The ID of the school
 * @param sessionCount - Number of sessions to create (default: 10)
 */
export const populateTestAccountWithSessions = async (
  studentId: string,
  schoolId: string,
  sessionCount = 10
) => {
  // Topics that will be used for mock sessions
  const topics = [
    'Algebra',
    'Geometry',
    'Calculus',
    'Biology',
    'Chemistry',
    'Physics',
    'American History',
    'World History',
    'Literature',
    'Grammar',
    'Spanish',
    'French',
    'Psychology',
    'Economics',
    'Computer Science',
    'Art History',
    'Music Theory'
  ];

  // Generate random sessions spread over the last month
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Create a batch of sessions
  const sessions = [];
  for (let i = 0; i < sessionCount; i++) {
    // Random date between one month ago and now
    const randomTime = oneMonthAgo.getTime() + Math.random() * (now.getTime() - oneMonthAgo.getTime());
    const sessionDate = new Date(randomTime);
    
    // Random end time (between 15 minutes and 2 hours after start)
    const sessionEndTime = new Date(sessionDate.getTime() + (15 + Math.random() * 105) * 60 * 1000);
    
    // Random topic from our list
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    // Random query count (between 3 and 15)
    const queryCount = Math.floor(Math.random() * 13) + 3;
    
    // Generate performance metrics
    const performanceMetric = {
      questionsAnswered: queryCount,
      averageResponseTime: Math.floor(Math.random() * 20) + 5,
      sessionRating: Math.floor(Math.random() * 5) + 1,
      conceptsLearned: Math.floor(Math.random() * 3) + 1,
      completionTime: sessionEndTime.toISOString(),
      conversationsViewed: Math.floor(Math.random() * 3)
    };
    
    sessions.push({
      id: uuidv4(),
      user_id: studentId,
      school_id: schoolId,
      topic_or_content_used: topic,
      session_start: sessionDate.toISOString(),
      session_end: sessionEndTime.toISOString(),
      num_queries: queryCount,
      performance_metric: performanceMetric,
      created_at: sessionDate.toISOString()
    });
  }

  // For test accounts, we directly insert into the database
  try {
    const { error } = await supabase.from('session_logs').insert(sessions);
    
    if (error) {
      console.error('Error creating test session logs:', error);
      return false;
    }
    
    console.log(`Created ${sessionCount} test sessions for student ${studentId}`);
    return true;
  } catch (error) {
    console.error('Exception creating test session logs:', error);
    return false;
  }
};

/**
 * Generate mock conversations with metadata for test users
 * @param userId User ID to create conversations for
 * @param schoolId School ID associated with the user
 */
export const generateMockConversations = async (userId: string, schoolId: string) => {
  try {
    const mockTopics = [
      "Algebra equations",
      "World War II", 
      "Chemical reactions",
      "Shakespeare's Macbeth",
      "Programming basics"
    ];
    
    const mockCategories = ["Homework", "Exam Prep", "Research", "Project", "General Question"];
    
    const now = new Date();
    
    // Create several conversations with metadata
    for (let i = 0; i < 5; i++) {
      const topic = mockTopics[i];
      const category = mockCategories[i];
      const summary = `Study session about ${topic} focused on ${Math.random() > 0.5 ? 'understanding concepts' : 'solving problems'}`;
      const tags = [topic.split(' ')[0].toLowerCase(), topic.split(' ')[1].toLowerCase(), category.toLowerCase()];
      
      const timestamp = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)).toISOString();
      
      // Create conversation entry
      const { data: convo, error: convoError } = await supabase.from('conversations').insert({
        user_id: userId,
        school_id: schoolId,
        topic,
        title: `${topic} study session`,
        summary,
        category,
        tags,
        starred: i === 0 || i === 2,
        last_message_at: timestamp,
        created_at: timestamp
      }).select().single();
      
      if (convoError) {
        console.error("Error creating mock conversation:", convoError);
        continue;
      }
      
      // Create message entries for this conversation
      if (convo) {
        const messageContents = [
          { sender: 'user', content: `Hi, I need help with ${topic}.` },
          { sender: 'assistant', content: `I'd be happy to help you with ${topic}. What specific aspect are you struggling with?` },
          { sender: 'user', content: `I'm having trouble understanding the core concepts.` },
          { sender: 'assistant', content: `Let me explain the key principles of ${topic} in a simple way...` }
        ];
        
        for (const message of messageContents) {
          await supabase.from('messages').insert({
            conversation_id: convo.id,
            sender: message.sender,
            content: message.content,
            timestamp: timestamp
          });
        }
      }
    }
    
    console.log(`Created mock conversations for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error generating mock conversations:", error);
    return false;
  }
};
