
import { supabase } from '@/integrations/supabase/client';

// Session logging functions
export const sessionLogger = {
  startSession: async (topic?: string) => {
    try {
      const { data, error } = await supabase.rpc('create_session_log', { topic });
      if (error) throw error;
      return data as string;
    } catch (error: any) {
      console.error('Error starting session:', error.message);
      return null;
    }
  },

  updateTopic: async (sessionId: string, topic: string) => {
    try {
      const { error } = await supabase.rpc('update_session_topic', {
        log_id: sessionId,
        topic
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error updating session topic:', error.message);
      return false;
    }
  },

  incrementQuery: async (sessionId: string) => {
    try {
      const { error } = await supabase.rpc('increment_session_query_count', {
        log_id: sessionId
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error incrementing query count:', error.message);
      return false;
    }
  },

  endSession: async (sessionId: string, performanceData?: any) => {
    try {
      const { error } = await supabase.rpc('end_session_log', {
        log_id: sessionId,
        performance_data: performanceData
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error ending session:', error.message);
      return false;
    }
  }
};

export default sessionLogger;
