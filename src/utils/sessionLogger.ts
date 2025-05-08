
import { supabase } from '@/integrations/supabase/client';
import { SessionLogResult, PerformanceData } from '@/components/chat/types';

export const sessionLogger = {
  startSessionLog: async (topic: string): Promise<SessionLogResult> => {
    try {
      // Call the create_session_log RPC function
      const { data, error } = await supabase.rpc('create_session_log', {
        topic
      });

      if (error) {
        console.error("Error starting session log:", error);
        return { id: '', success: false, error: error.message };
      }

      return { id: data, success: true };
    } catch (err: any) {
      console.error("Failed to create session log:", err);
      return { id: '', success: false, error: err.message };
    }
  },

  endSessionLog: async (sessionId: string, performanceData?: PerformanceData): Promise<{ success: boolean }> => {
    try {
      // Call the end_session_log RPC function
      const { error } = await supabase.rpc('end_session_log', {
        log_id: sessionId,
        performance_data: performanceData ? performanceData : null
      });

      if (error) {
        console.error("Error ending session log:", error);
        return { success: false };
      }

      return { success: true };
    } catch (err) {
      console.error("Failed to end session log:", err);
      return { success: false };
    }
  },

  updateSessionTopic: async (sessionId: string, topic: string): Promise<{ success: boolean }> => {
    try {
      // Call the update_session_topic RPC function
      const { error } = await supabase.rpc('update_session_topic', {
        log_id: sessionId,
        topic
      });

      if (error) {
        console.error("Error updating session topic:", error);
        return { success: false };
      }

      return { success: true };
    } catch (err) {
      console.error("Failed to update session topic:", err);
      return { success: false };
    }
  },

  incrementQueryCount: async (sessionId: string): Promise<{ success: boolean }> => {
    try {
      // Call the increment_session_query_count RPC function
      const { error } = await supabase.rpc('increment_session_query_count', {
        log_id: sessionId
      });

      if (error) {
        console.error("Error incrementing query count:", error);
        return { success: false };
      }

      return { success: true };
    } catch (err) {
      console.error("Failed to increment query count:", err);
      return { success: false };
    }
  }
};
