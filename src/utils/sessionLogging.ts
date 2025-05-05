
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Log session start directly in database
const logSessionStart = async (topic?: string, userId?: string): Promise<string | null> => {
  try {
    // Don't log sessions on specific pages
    if (window.location.pathname === '/test-accounts' || 
        window.location.pathname === '/admin' ||
        window.location.pathname.includes('/dashboard')) {
      return null;
    }
    
    const user_id = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!user_id) {
      console.error("No authenticated user found");
      return null;
    }
    
    // Get school ID for this user
    const { data: userData } = await supabase
      .from('students')
      .select('school_id')
      .eq('id', user_id)
      .single();
      
    if (!userData?.school_id) {
      console.error("No school ID found for user");
      return null;
    }
    
    // Create the session log directly in the database
    const { data: sessionData, error: sessionError } = await supabase
      .from('session_logs')
      .insert({
        user_id: user_id,
        school_id: userData.school_id,
        topic_or_content_used: topic || "General Chat",
        session_start: new Date()
      })
      .select('id')
      .single();
      
    if (sessionError) {
      console.error("Error starting session:", sessionError);
      return null;
    }
    
    return sessionData?.id || null;
  } catch (error) {
    console.error("Error starting session:", error);
    return null;
  }
};

// Log session end directly in database
const logSessionEnd = async (sessionId?: string, performanceData?: any): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to end");
      return;
    }

    // Update the session log directly in the database
    const { error } = await supabase
      .from('session_logs')
      .update({ 
        session_end: new Date(),
        performance_metric: performanceData || null
      })
      .eq('id', sessionId);

    if (error) {
      console.error("Error ending session:", error);
      return;
    }

    // Clear the active session from localStorage if it matches
    const activeSessionId = localStorage.getItem("activeSessionId");
    if (activeSessionId === sessionId) {
      localStorage.removeItem("activeSessionId");
    }
  } catch (error) {
    console.error("Error ending session:", error);
  }
};

// Update session topic directly in database
const updateSessionTopic = async (sessionId: string, topic: string): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to update topic");
      return;
    }

    // Update the session topic directly in the database
    const { error } = await supabase
      .from('session_logs')
      .update({ topic_or_content_used: topic })
      .eq('id', sessionId);

    if (error) {
      console.error("Error updating session topic:", error);
    }
  } catch (error) {
    console.error("Error updating session topic:", error);
  }
};

// Increment query count for a session directly in database
const incrementQueryCount = async (sessionId: string): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to increment query count");
      return;
    }

    // First, get the current query count
    const { data: sessionData, error: fetchError } = await supabase
      .from('session_logs')
      .select('num_queries')
      .eq('id', sessionId)
      .single();
    
    if (fetchError) {
      console.error("Error fetching session:", fetchError);
      return;
    }
    
    // Increment the query count
    const { error: updateError } = await supabase
      .from('session_logs')
      .update({ num_queries: (sessionData?.num_queries || 0) + 1 })
      .eq('id', sessionId);

    if (updateError) {
      console.error("Error incrementing query count:", updateError);
    }
  } catch (error) {
    console.error("Error incrementing query count:", error);
  }
};

// Check if there is an active session
const hasActiveSession = (): boolean => {
  return localStorage.getItem("activeSessionId") !== null;
};

// Create a wrapper object to match what the components expect
const sessionLogger = {
  startSession: async (topic?: string, userId?: string): Promise<string | null> => {
    try {
      // Don't start sessions on admin pages or dashboard
      if (window.location.pathname === '/test-accounts' || 
          window.location.pathname === '/admin' ||
          window.location.pathname.startsWith('/admin/') ||
          window.location.pathname === '/dashboard' ||
          window.location.pathname === '/documents') {
        return null;
      }
      
      const sessionId = await logSessionStart(topic, userId);
      if (sessionId) {
        localStorage.setItem("activeSessionId", sessionId);
        return sessionId;
      }
      return null;
    } catch (error) {
      console.error("Error in startSession:", error);
      return null;
    }
  },
  endSession: async (reason?: string, performanceData?: any): Promise<void> => {
    // Don't process session events on the test-accounts page
    if (window.location.pathname === '/test-accounts') {
      return;
    }
    
    const sessionId = localStorage.getItem("activeSessionId");
    if (sessionId) {
      await logSessionEnd(sessionId, performanceData);
    }
  },
  updateSessionTopic,
  incrementQueryCount,
  hasActiveSession
};

// Function to generate mock analytics data for test accounts
export const getMockAnalyticsData = (schoolId: string, options?: { startDate?: string, endDate?: string }) => {
  // Constants to generate consistent data
  const NUM_STUDENTS = 12;
  const NUM_SESSIONS = 35;
  const AVG_MINUTES = 22;
  const NUM_QUERIES = 105;
  
  // Generate mock sessions
  const sessions = Array(NUM_SESSIONS).fill(null).map((_, i) => ({
    id: `mock-session-${i}`,
    userId: `student-${i % NUM_STUDENTS + 1}`,
    userName: `Student ${i % NUM_STUDENTS + 1}`,
    startTime: new Date(Date.now() - i * 86400000).toISOString(),
    endTime: new Date(Date.now() - i * 86400000 + 30 * 60000).toISOString(),
    duration: Math.floor(Math.random() * 45) + 10,
    topicOrContent: ['Algebra equations', 'World War II', 'Chemical reactions', 'Shakespeare', 'Programming'][i % 5],
    numQueries: Math.floor(Math.random() * 10) + 3,
    queries: Math.floor(Math.random() * 10) + 3
  }));
  
  // Generate mock topics
  const topicNames = ['Algebra equations', 'World War II', 'Chemical reactions', 'Shakespeare', 'Programming'];
  const topics = topicNames.map((name, i) => ({
    topic: name,
    name,
    count: Math.floor(Math.random() * 15) + 5,
    value: Math.floor(Math.random() * 15) + 5
  }));
  
  // Generate mock study time
  const studyTime = Array(NUM_STUDENTS).fill(null).map((_, i) => ({
    studentName: `Student ${i + 1}`,
    name: `Student ${i + 1}`,
    hours: Math.floor(Math.random() * 5) + 1,
    week: 1,
    year: new Date().getFullYear()
  }));
  
  // Return mock data object
  return {
    summary: {
      activeStudents: NUM_STUDENTS,
      totalSessions: NUM_SESSIONS,
      totalQueries: NUM_QUERIES,
      avgSessionMinutes: AVG_MINUTES
    },
    sessions,
    topics,
    studyTime
  };
};

// Function to populate test account with sessions
export const populateTestAccountWithSessions = async (userId: string, schoolId: string, numSessions = 5) => {
  try {
    // Skip calls for non-test users or if missing required IDs
    if (!userId || !schoolId) {
      return { success: false, message: "Missing user ID or school ID" };
    }
    
    // Detect if this is a test account
    const isTest = userId.startsWith('test-') || schoolId.startsWith('test-');
    if (!isTest) {
      // Only create test sessions for test accounts
      return { success: false, message: "Not a test account" };
    }
    
    console.log(`Creating test sessions for ${userId} in school ${schoolId}`);
    
    // Create mock sessions directly in the database
    const topics = ['Algebra equations', 'World War II', 'Chemical reactions', 'Shakespeare\'s Macbeth', 'Programming basics'];
    
    const now = new Date();
    
    for (let i = 0; i < numSessions; i++) {
      // Pick a random topic
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      
      // Random time in the past (0-30 days ago)
      const randomDays = Math.floor(Math.random() * 30);
      const sessionDate = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
      
      // Random duration between 10-60 minutes
      const duration = Math.floor(Math.random() * 50) + 10;
      
      // Session end time
      const endDate = new Date(sessionDate.getTime() + duration * 60 * 1000);
      
      // Random number of queries between 3-15
      const queries = Math.floor(Math.random() * 12) + 3;
      
      // Create the session log
      await supabase.from('session_logs').insert({
        user_id: userId,
        school_id: schoolId,
        topic_or_content_used: randomTopic,
        session_start: sessionDate.toISOString(),
        session_end: endDate.toISOString(),
        num_queries: queries
      });
    }
    
    return { success: true, message: `Created ${numSessions} test sessions` };
  } catch (error) {
    console.error("Error in populateTestAccountWithSessions:", error);
    return { success: false, message: error.message };
  }
};

export default sessionLogger;
