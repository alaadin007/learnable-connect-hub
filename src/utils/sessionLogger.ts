
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
    
    // Get the current session without waiting for refresh
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session && !userId) {
      // No authenticated session and no test user ID provided
      console.log("No authenticated session for session logging");
      return null;
    }
    
    const userIdToUse = userId || session?.user.id;
    
    if (!userIdToUse) {
      console.log("No user ID available for session logging");
      return null;
    }
    
    // For test users, create a mock session log without requiring database access
    if (userIdToUse.startsWith('test-')) {
      console.log("Creating mock session log for test user", userIdToUse);
      const mockSessionId = `mock-session-${Date.now()}`;
      localStorage.setItem("activeSessionId", mockSessionId);
      return mockSessionId;
    }
    
    // For real users, continue with the database access
    try {
      // Get the user's school ID
      const { data: profileData } = await supabase
        .from("profiles")
        .select("school_id, organization")
        .eq("id", userIdToUse)
        .single();
        
      let schoolIdToUse = profileData?.school_id;
      
      if (!schoolIdToUse && profileData?.organization) {
        // Ensure organization is treated as an object with proper typing
        const organization = profileData.organization as { id?: string };
        if (organization && typeof organization === 'object' && 'id' in organization) {
          schoolIdToUse = organization.id;
        }
      }
      
      // If still no school found, check students table
      if (!schoolIdToUse) {
        const { data: studentData } = await supabase
          .from("students")
          .select("school_id")
          .eq("id", userIdToUse)
          .single();
          
        if (studentData?.school_id) {
          schoolIdToUse = studentData.school_id;
        } else {
          // If not a student, check teachers table
          const { data: teacherData } = await supabase
            .from("teachers")
            .select("school_id")
            .eq("id", userIdToUse)
            .single();
            
          if (teacherData?.school_id) {
            schoolIdToUse = teacherData.school_id;
          }
        }
      }
      
      if (!schoolIdToUse) {
        console.error("No school ID found for user");
        return null;
      }
      
      // Insert the session log directly
      const { data: logData, error: insertError } = await supabase
        .from("session_logs")
        .insert({
          user_id: userIdToUse,
          school_id: schoolIdToUse,
          topic_or_content_used: topic || "General Chat",
          session_start: new Date().toISOString()
        })
        .select("id")
        .single();
        
      if (insertError) {
        console.error("Error creating session log:", insertError);
        return null;
      }
  
      // Fix TypeScript errors by properly type checking the returned object
      if (logData && typeof logData === 'object' && 'id' in logData) {
        return logData.id as string;
      }
    } catch (dbError) {
      console.error("Database error in session logging:", dbError);
      // Continue with mock session for resilience
      const mockSessionId = `mock-session-fallback-${Date.now()}`;
      localStorage.setItem("activeSessionId", mockSessionId);
      return mockSessionId;
    }
    
    return null;
  } catch (error) {
    console.error("Error starting session:", error);
    return null;
  }
};

// Log session end in Supabase
const logSessionEnd = async (sessionId?: string, performanceData?: any): Promise<void> => {
  try {
    if (!sessionId) {
      return;
    }

    // For mock sessions, just remove from localStorage
    if (sessionId.startsWith('mock-session')) {
      localStorage.removeItem("activeSessionId");
      return;
    }

    // Update the session_end timestamp directly
    try {
      const { error } = await supabase
        .from("session_logs")
        .update({
          session_end: new Date().toISOString(),
          performance_metric: performanceData || null
        })
        .eq("id", sessionId);
      
      if (error) {
        console.error("Error ending session:", error);
      }
    } catch (dbError) {
      console.error("Database error ending session:", dbError);
    }

    // Clear the active session from localStorage
    const activeSessionId = localStorage.getItem("activeSessionId");
    if (activeSessionId === sessionId) {
      localStorage.removeItem("activeSessionId");
    }
  } catch (error) {
    console.error("Error ending session:", error);
  }
};

// Create an object to encapsulate session logging functionality
const sessionLogger = {
  startSession: logSessionStart,
  endSession: logSessionEnd,
  
  // Update active session topic
  updateTopic: async (sessionId: string, topic: string): Promise<void> => {
    try {
      if (!sessionId || sessionId.startsWith('mock-session')) {
        return;
      }
      
      await supabase
        .from("session_logs")
        .update({ topic_or_content_used: topic })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error updating session topic:", error);
    }
  },
  
  // Increment query count for session
  incrementQueryCount: async (sessionId: string): Promise<void> => {
    try {
      if (!sessionId || sessionId.startsWith('mock-session')) {
        return;
      }
      
      await supabase.rpc('increment_session_query_count', { log_id: sessionId });
    } catch (error) {
      // Silently fail - non-critical operation
      console.error("Error incrementing query count:", error);
    }
  }
};

export default sessionLogger;

// Function to populate test accounts with mock session data
export const populateTestAccountWithSessions = async (
  userId: string, 
  schoolId: string,
  numSessions = 5
): Promise<void> => {
  // For test accounts, we don't actually need to create real data
  console.log(`Mock populating test sessions for ${userId} with school ${schoolId}`);
  
  // In a real system, this would create actual data
  // Since this is just for test accounts, we'll skip the actual data creation
  return;
};
