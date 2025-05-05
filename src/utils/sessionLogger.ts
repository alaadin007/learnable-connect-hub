
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
    
    // If not testing with a mock userId, use the edge function
    if (!userId) {
      const { data, error } = await supabase.functions.invoke("create-session-log", {
        body: { topic: topic || "General Chat" }
      });

      if (error) {
        console.error("Error starting session:", error);
        return null;
      }

      return data?.logId || null;
    } else {
      // For test accounts, we need special handling
      // First get the school ID for this user
      const { data: userData } = await supabase
        .from('students')
        .select('school_id')
        .eq('id', userId)
        .single();
        
      if (!userData?.school_id) {
        console.error("No school ID found for test user");
        return null;
      }
      
      // Then create the session log directly
      const { data: sessionData, error: sessionError } = await supabase
        .from('session_logs')
        .insert({
          user_id: userId,
          school_id: userData.school_id,
          topic_or_content_used: topic || "General Chat"
        })
        .select('id')
        .single();
        
      if (sessionError) {
        console.error("Error creating test session:", sessionError);
        return null;
      }
      
      return sessionData?.id || null;
    }
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

    // Call the endpoint to end the session
    const { error } = await supabase.functions.invoke("end-session", {
      body: { logId: sessionId, performanceData }
    });

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

    // Call the endpoint to update the session topic
    const { error } = await supabase.functions.invoke("update-session", {
      body: { logId: sessionId, topic }
    });

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

    // Call the RPC function to increment the query count
    const { error } = await supabase.rpc("increment_session_query_count", {
      log_id: sessionId
    });

    if (error) {
      console.error("Error incrementing query count:", error);
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

export default sessionLogger;
