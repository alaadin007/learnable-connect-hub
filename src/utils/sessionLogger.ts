
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

    try {
      // Silently try to end session without causing UI errors
      const { error } = await supabase.functions.invoke("end-session", {
        body: { logId: sessionId, performanceData }
      });
      
      if (error) {
        // Just log the error silently without disrupting the UI
        console.error("Silent error ending session:", error);
      }
    } catch (error) {
      // Fallback error handling - also silent
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
    // Silently try to update session without causing UI errors
    const { error } = await supabase.functions.invoke("update-session", {
      body: { logId: sessionId, topic }
    });
    
    if (error) {
      // Just log the error silently without disrupting the UI
      console.error("Silent error updating session topic:", error);
    }
  } catch (error) {
    // Fallback error handling - also silent
    console.error("Error updating session topic:", error);
  }
};

// Increment query count for a session
const incrementQueryCount = async (sessionId: string): Promise<void> => {
  if (!sessionId) return;

  // Silently try to increment count without causing UI errors
  try {
    // Use the update-session edge function instead of direct RPC call
    const { error } = await supabase.functions.invoke("update-session", {
      body: { logId: sessionId, action: "increment_query" }
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
