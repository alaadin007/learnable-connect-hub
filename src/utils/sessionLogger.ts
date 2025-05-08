import { supabase } from '@/integrations/supabase/client';

// Define interfaces for better type safety
interface SessionLogResult {
  success: boolean;
  sessionId?: string;
  message?: string;
}

interface PerformanceData {
  duration?: number;
  queries?: number;
  errors?: number;
  [key: string]: any;
}

interface SessionLog {
  id: string;
  topic_or_content_used: string;
  created_at?: string;
  updated_at?: string;
}

interface SupabaseFunctionResponse<T> {
  data: T | null;
  error: {
    message: string;
    status?: number;
  } | null;
}

/**
 * Start a new session log
 */
export const startSessionLog = async (topic: string): Promise<SessionLogResult> => {
  try {
    const { data, error } = await supabase.functions.invoke<SessionLog>('create-session-log', {
      body: { topic }
    });

    if (error) {
      console.error("Error starting session log:", error);
      return { success: false, message: error.message };
    }

    if (data?.id) {
      return { success: true, sessionId: data.id };
    }

    // Fallback to direct database call if function fails
    const { data: directData, error: directError } = await supabase
      .from('session_logs')
      .insert<Partial<SessionLog>>({
        topic_or_content_used: topic
      })
      .select()
      .single();

    if (directError) {
      console.error("Error starting session (direct):", directError);
      return { success: false, message: directError.message };
    }

    if (!directData?.id) {
      return { success: false, message: "No session ID returned" };
    }

    return { success: true, sessionId: directData.id };
  } catch (error) {
    console.error("Error in startSessionLog:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unexpected error occurred" 
    };
  }
};

/**
 * End an existing session log
 */
export const endSessionLog = async (
  sessionId: string, 
  performanceData?: PerformanceData
): Promise<SessionLogResult> => {
  try {
    const { data, error } = await supabase.functions.invoke<SessionLog>('end-session', {
      body: { 
        session_id: sessionId, 
        performance_data: performanceData 
      }
    });

    if (error) {
      console.error("Error ending session log:", error);
      return { success: false, message: error.message };
    }

    return { success: true, sessionId };
  } catch (error) {
    console.error("Error in endSessionLog:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unexpected error occurred" 
    };
  }
};

/**
 * Update a session topic
 */
export const updateSessionTopic = async (
  sessionId: string, 
  topic: string
): Promise<SessionLogResult> => {
  try {
    const { data, error } = await supabase.functions.invoke<SessionLog>('update-session', {
      body: { 
        session_id: sessionId, 
        topic 
      }
    });

    if (error) {
      console.error("Error updating session topic:", error);
      return { success: false, message: error.message };
    }

    return { success: true, sessionId };
  } catch (error) {
    console.error("Error in updateSessionTopic:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unexpected error occurred" 
    };
  }
};

// Create a type-safe session logger object
const sessionLogger = {
  startSessionLog,
  endSessionLog,
  updateSessionTopic
} as const;

export default sessionLogger;