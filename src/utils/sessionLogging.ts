
import { supabase } from "@/integrations/supabase/client";

type SessionLogData = {
  topic?: string;
  performance?: any;
};

export const createSessionLog = async (topic?: string) => {
  try {
    const { data, error } = await supabase.rpc('create_session_log', { topic });
    
    if (error) {
      console.error('Error creating session log:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Exception creating session log:', err);
    return null;
  }
};

export const updateSessionTopic = async (logId: string, topic: string) => {
  try {
    const { error } = await supabase.rpc('update_session_topic', { 
      log_id: logId,
      topic 
    });
    
    if (error) {
      console.error('Error updating session topic:', error);
    }
  } catch (err) {
    console.error('Exception updating session topic:', err);
  }
};

export const incrementQueryCount = async (logId: string) => {
  try {
    const { error } = await supabase.rpc('increment_session_query_count', { 
      log_id: logId 
    });
    
    if (error) {
      console.error('Error incrementing query count:', error);
    }
  } catch (err) {
    console.error('Exception incrementing query count:', err);
  }
};

export const endSessionLog = async (logId: string, performanceData?: any) => {
  try {
    const { error } = await supabase.rpc('end_session_log', { 
      log_id: logId,
      performance_data: performanceData 
    });
    
    if (error) {
      console.error('Error ending session log:', error);
    }
  } catch (err) {
    console.error('Exception ending session log:', err);
  }
};
