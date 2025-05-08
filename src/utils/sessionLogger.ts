
import { supabase } from '@/integrations/supabase/client';

interface SessionLogResult {
  success: boolean;
  sessionId?: string;
  message?: string;
}

/**
 * Start a new session log
 */
export const startSessionLog = async (topic: string): Promise<SessionLogResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-session-log', {
      body: { topic }
    });

    if (error) {
      console.error("Error starting session log:", error);
      return { success: false, message: error.message };
    }

    if (data && data.id) {
      return { success: true, sessionId: data.id };
    }

    // Fallback to direct database call if function fails
    const { data: directData, error: directError } = await supabase
      .from('session_logs')
      .insert({
        topic_or_content_used: topic
      })
      .select()
      .single();

    if (directError) {
      console.error("Error starting session (direct):", directError);
      return { success: false, message: directError.message };
    }

    return { success: true, sessionId: directData.id };
  } catch (error: any) {
    console.error("Error in startSessionLog:", error);
    return { success: false, message: error.message || "An unexpected error occurred" };
  }
};

/**
 * End an existing session log
 */
export const endSessionLog = async (sessionId: string, performanceData?: any): Promise<SessionLogResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('end-session', {
      body: { session_id: sessionId, performance_data: performanceData }
    });

    if (error) {
      console.error("Error ending session log:", error);
      return { success: false, message: error.message };
    }

    return { success: true, sessionId };
  } catch (error: any) {
    console.error("Error in endSessionLog:", error);
    return { success: false, message: error.message || "An unexpected error occurred" };
  }
};

/**
 * Update a session topic
 */
export const updateSessionTopic = async (sessionId: string, topic: string): Promise<SessionLogResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('update-session', {
      body: { session_id: sessionId, topic }
    });

    if (error) {
      console.error("Error updating session topic:", error);
      return { success: false, message: error.message };
    }

    return { success: true, sessionId };
  } catch (error: any) {
    console.error("Error in updateSessionTopic:", error);
    return { success: false, message: error.message || "An unexpected error occurred" };
  }
};

export default {
  startSessionLog,
  endSessionLog,
  updateSessionTopic
};
