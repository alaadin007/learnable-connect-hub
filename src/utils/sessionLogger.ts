
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
    
    // Create a payload with the topic and user ID if provided
    const payload: Record<string, any> = { topic: topic || "General Chat" };
    if (userId) {
      payload.userId = userId;
    }
    
    // Invoke the edge function without blocking the UI
    try {
      const result = await invokeEdgeFunction<{ logId: string; success: boolean }>("create-session-log", payload);
      
      if (result?.success && result?.logId) {
        return result.logId;
      }
    } catch (error) {
      console.error("Error creating session:", error);
      // Don't show toast errors during login to prevent UI disruption
      return null;
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

    // Call the endpoint to end the session without waiting for response
    // Use .then().catch() pattern instead of just .catch()
    supabase.functions.invoke("end-session", {
      body: { logId: sessionId, performanceData }
    }).then(response => {
      // Optional: Process the response if needed
    }).catch(error => {
      console.error("Error ending session:", error);
    });

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

  // Call the endpoint to update the session topic without blocking
  // Use .then().catch() pattern instead of just .catch()
  supabase.functions.invoke("update-session", {
    body: { logId: sessionId, topic }
  }).then(response => {
    // Optional: Process the response if needed
  }).catch(error => {
    console.error("Error updating session topic:", error);
  });
};

// Increment query count for a session
const incrementQueryCount = async (sessionId: string): Promise<void> => {
  if (!sessionId) return;

  // Call the RPC function to increment the query count without blocking
  // Use .then().catch() pattern instead of just .catch()
  supabase.rpc("increment_session_query_count", {
    log_id: sessionId
  }).then(response => {
    // Optional: Process the response if needed
  }).catch(error => {
    console.error("Error incrementing query count:", error);
  });
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
      logSessionStart(topic, userId).then(sessionId => {
        if (sessionId) {
          localStorage.setItem("activeSessionId", sessionId);
        }
      });
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
      logSessionEnd(sessionId, performanceData);
    }
  },
  
  updateSessionTopic,
  incrementQueryCount,
  hasActiveSession
};

export default sessionLogger;
