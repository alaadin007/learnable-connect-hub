
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
    
    // Get the user's school ID
    const { data: profileData } = await supabase
      .from("profiles")
      .select("school_id, organization")
      .eq("id", userIdToUse)
      .single();
      
    let schoolIdToUse = profileData?.school_id;
    
    if (!schoolIdToUse && profileData?.organization?.id) {
      schoolIdToUse = profileData.organization.id;
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
    
    // For test users, create a mock school ID if none found
    if (!schoolIdToUse && (userIdToUse.startsWith('test-'))) {
      schoolIdToUse = 'test-school-0';
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

    return logData.id;
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

    // Update the session_end timestamp directly
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
  if (!sessionId) return;

  try {
    // Update the topic directly
    const { error } = await supabase
      .from("session_logs")
      .update({ topic_or_content_used: topic })
      .eq("id", sessionId);
    
    if (error) {
      console.error("Error updating session topic:", error);
    }
  } catch (error) {
    console.error("Error updating session topic:", error);
  }
};

// Increment query count for a session
const incrementQueryCount = async (sessionId: string): Promise<void> => {
  if (!sessionId) return;

  // Silently try to increment count without causing UI errors
  try {
    // Use the RPC function directly
    const { error } = await supabase.rpc("increment_session_query_count", {
      log_id: sessionId
    });
    
    if (error) {
      console.error("Silent error incrementing query count:", error);
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
    // Don't start sessions on admin pages or dashboard
    if (window.location.pathname === '/test-accounts' || 
        window.location.pathname === '/admin' ||
        window.location.pathname.startsWith('/admin/') ||
        window.location.pathname === '/dashboard' ||
        window.location.pathname === '/documents') {
      return null;
    }
    
    // For login page, don't block the UI with session logging
    if (window.location.pathname === '/login') {
      // Start session logging in the background without awaiting
      try {
        // Use promise without awaiting but with proper error handling
        logSessionStart(topic, userId)
          .then(sessionId => {
            if (sessionId) {
              localStorage.setItem("activeSessionId", sessionId);
            }
          })
          .catch(error => {
            console.error("Login page session start error:", error);
          });
      } catch (error) {
        console.error("Login page session start error:", error);
      }
      return null;
    }
    
    try {
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
      // Call without awaiting to avoid blocking UI
      logSessionEnd(sessionId, performanceData).catch(error => {
        console.error("Silent error in endSession:", error);
      });
    }
  },
  
  updateSessionTopic,
  incrementQueryCount,
  hasActiveSession
};

export default sessionLogger;
