
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Log session start in Supabase
const logSessionStart = async (topic?: string, userId?: string): Promise<string | null> => {
  try {
    // Don't log sessions on specific pages
    if (window.location.pathname === '/test-accounts' || 
        window.location.pathname === '/admin' ||
        window.location.pathname.includes('/dashboard')) {
      return null;
    }
    
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!currentUserId) {
      console.warn("No user ID available to log session");
      return null;
    }
    
    // Get school ID for this user
    let schoolId = null;
    
    // Try to get school ID from students table
    const { data: studentData } = await supabase
      .from('students')
      .select('school_id')
      .eq('id', currentUserId)
      .single();
      
    if (studentData?.school_id) {
      schoolId = studentData.school_id;
    } else {
      // If not a student, try teachers table
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('school_id')
        .eq('id', currentUserId)
        .single();
        
      if (teacherData?.school_id) {
        schoolId = teacherData.school_id;
      }
    }
    
    if (!schoolId) {
      console.warn("No school ID found for user");
      return null;
    }
    
    // Create the session log directly
    const { data: sessionData, error: sessionError } = await supabase
      .from('session_logs')
      .insert({
        user_id: currentUserId,
        school_id: schoolId,
        topic_or_content_used: topic || "General Chat"
      })
      .select('id')
      .single();
      
    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return null;
    }
    
    return sessionData?.id || null;
  } catch (error) {
    console.error("Error starting session:", error);
    return null;
  }
};

// Log session end in Supabase
const logSessionEnd = async (sessionId?: string, performanceData?: any): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to end");
      return;
    }

    // Update the session directly
    const { error } = await supabase
      .from('session_logs')
      .update({ 
        session_end: new Date().toISOString(),
        performance_metric: performanceData
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

// Update session topic in Supabase
const updateSessionTopic = async (sessionId: string, topic: string): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to update topic");
      return;
    }

    // Update the topic directly
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

// Increment query count for a session
const incrementQueryCount = async (sessionId: string): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to increment query count");
      return;
    }

    // Get current count
    const { data, error: fetchError } = await supabase
      .from('session_logs')
      .select('num_queries')
      .eq('id', sessionId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching query count:", fetchError);
      return;
    }
    
    // Increment and update
    const currentCount = data?.num_queries || 0;
    const { error: updateError } = await supabase
      .from('session_logs')
      .update({ num_queries: currentCount + 1 })
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
    
    // Instead of edge function, call the database function directly
    const { data, error } = await supabase.rpc('populatetestaccountwithsessions', {
      userid: userId,
      schoolid: schoolId,
      num_sessions: numSessions
    });
    
    if (error) {
      console.error("Error creating test sessions:", error);
      return { success: false, message: error.message };
    }
    
    console.log("Test sessions created successfully");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error in populateTestAccountWithSessions:", error);
    return { success: false, message: error.message };
  }
};

export default sessionLogger;
