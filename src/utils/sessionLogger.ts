
import { supabase } from "@/integrations/supabase/client";

export interface PerformanceData {
  accuracy?: number;
  speed?: number;
  engagement?: number;
  comprehension?: number;
  feedback?: string;
  [key: string]: any; // Add index signature to make it compatible with Json type
}

export const startSession = async (topic?: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc("create_session_log", {
      topic: topic || null,
    });

    if (error) {
      console.error("Error starting session:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error starting session:", error);
    return null;
  }
};

// Alias for AIChatInterface compatibility
export const createSessionLog = startSession;

export const incrementQueryCount = async (sessionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc("increment_session_query_count", {
      log_id: sessionId,
    });

    if (error) {
      console.error("Error incrementing query count:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error incrementing query count:", error);
    return false;
  }
};

// Alias for AIChatInterface compatibility
export const incrementSessionQueryCount = incrementQueryCount;

export const updateSessionTopic = async (sessionId: string, topic: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc("update_session_topic", {
      log_id: sessionId,
      topic: topic,
    });

    if (error) {
      console.error("Error updating session topic:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating session topic:", error);
    return false;
  }
};

export const endSession = async (
  sessionId: string,
  performanceMetrics?: PerformanceData
) => {
  try {
    const performanceData = performanceMetrics ? performanceMetrics : null;

    const { error } = await supabase.rpc("end_session_log", {
      log_id: sessionId,
      performance_data: performanceData
    });

    if (error) {
      console.error("Error ending session:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error ending session:", error);
    return false;
  }
};
