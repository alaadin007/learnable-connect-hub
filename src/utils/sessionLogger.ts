
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invokeEdgeFunction } from "./apiHelpers";

// Log session start in Supabase
const logSessionStart = async (topic?: string, userId?: string): Promise<string | null> => {
  try {
    // Don't log sessions on specific pages
    if (window.location.pathname === '/test-accounts' || 
        window.location.pathname === '/admin' ||
        window.location.pathname.includes('/dashboard')) {
      return null;
    }
    
    console.log("Starting session logging for topic:", topic, "userId:", userId || "current user");
    
    try {
      // Use invokeEdgeFunction with proper userId if provided (for test accounts)
      const payload: Record<string, any> = { topic: topic || "General Chat" };
      if (userId) {
        payload.userId = userId;
      }
      
      const result = await invokeEdgeFunction<{ logId: string; success: boolean }>("create-session-log", payload);
      
      console.log("Session log creation result:", result);
      
      if (result?.success && result?.logId) {
        return result.logId;
      }
      return null;
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to start session logging");
      return null;
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

    console.log("Ending session:", sessionId);

    // Call the endpoint to end the session
    const { error } = await supabase.functions.invoke("end-session", {
      body: { logId: sessionId, performanceData }
    });

    if (error) {
      console.error("Error ending session:", error);
      toast.error("Failed to end session logging");
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
      
      console.log(`Starting session with topic: ${topic}, userId: ${userId || 'current user'}`);
      
      const sessionId = await logSessionStart(topic, userId);
      if (sessionId) {
        localStorage.setItem("activeSessionId", sessionId);
        console.log(`Session started successfully with ID: ${sessionId}`);
        return sessionId;
      }
      
      console.warn("Failed to start session - no sessionId returned");
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
      console.log(`Ending session ${sessionId}, reason: ${reason || 'not specified'}`);
      await logSessionEnd(sessionId, performanceData);
    } else {
      console.log("No active session to end");
    }
  },
  updateSessionTopic,
  incrementQueryCount,
  hasActiveSession
};

export default sessionLogger;
