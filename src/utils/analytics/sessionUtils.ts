
import { supabase } from "@/integrations/supabase/client";

// Create session log in database
export const createSessionLog = async (topic?: string): Promise<string | null> => {
  try {
    // Use the RPC function directly
    const { data, error } = await supabase.rpc("create_session_log", {
      topic: topic || "General Chat"
    });

    if (error) {
      console.error("Error creating session log:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error in createSessionLog:", error);
    return null;
  }
};

// End session log in database
export const endSessionLog = async (sessionId?: string, performanceData?: any): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to end");
      return;
    }

    // Use the RPC function directly
    const { error } = await supabase.rpc("end_session_log", {
      log_id: sessionId,
      performance_data: performanceData
    });

    if (error) {
      console.error("Error ending session:", error);
    }
  } catch (error) {
    console.error("Error in endSessionLog:", error);
  }
};

// Update session topic in database
export const updateSessionTopic = async (sessionId: string, topic: string): Promise<void> => {
  try {
    if (!sessionId) {
      console.warn("No session ID provided to update topic");
      return;
    }

    // Use the RPC function directly
    const { error } = await supabase.rpc("update_session_topic", {
      log_id: sessionId,
      topic
    });

    if (error) {
      console.error("Error updating session topic:", error);
    }
  } catch (error) {
    console.error("Error in updateSessionTopic:", error);
  }
};
