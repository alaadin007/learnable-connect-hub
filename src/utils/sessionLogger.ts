
// Adding the incrementQueryCount function that was missing

import { supabase } from '@/integrations/supabase/client';

export interface SessionLogResult {
  sessionId: string;
  success: boolean;
}

export interface PerformanceData {
  accuracy?: number;
  speed?: number;
  comprehension?: number;
}

const sessionLogger = {
  startSessionLog: async (topic: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('create-session-log', {
        body: { topic }
      });

      if (error) {
        console.error('Failed to start session log:', error);
        return '';
      }

      return data.session_id;
    } catch (e) {
      console.error('Error starting session log:', e);
      return '';
    }
  },

  endSessionLog: async (sessionId: string, performanceData: PerformanceData = {}): Promise<SessionLogResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('end-session', {
        body: { session_id: sessionId, performance_data: performanceData }
      });

      if (error) {
        console.error('Failed to end session log:', error);
        return { sessionId, success: false };
      }

      return { sessionId, success: true };
    } catch (e) {
      console.error('Error ending session log:', e);
      return { sessionId, success: false };
    }
  },

  updateSessionTopic: async (sessionId: string, topic: string): Promise<SessionLogResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('update-session', {
        body: { session_id: sessionId, topic }
      });

      if (error) {
        console.error('Failed to update session topic:', error);
        return { sessionId, success: false };
      }

      return { sessionId, success: true };
    }
    catch (e) {
      console.error('Error updating session topic:', e);
      return { sessionId, success: false };
    }
  },

  incrementQueryCount: async (sessionId: string): Promise<SessionLogResult> => {
    try {
      // Call the Supabase function to increment the query count
      const { data, error } = await supabase.rpc('increment_session_query_count', {
        log_id: sessionId
      });

      if (error) {
        console.error('Failed to increment query count:', error);
        return { sessionId, success: false };
      }

      return { sessionId, success: true };
    } catch (e) {
      console.error('Error incrementing query count:', e);
      return { sessionId, success: false };
    }
  }
};

export default sessionLogger;
