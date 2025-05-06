
import { supabase } from '@/integrations/supabase/client';

export async function createSessionLog(topic?: string) {
  try {
    const { data, error } = await supabase.rpc('create_session_log', { topic });
    
    if (error) {
      console.error('Error creating session log:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createSessionLog:', error);
    return null;
  }
}

export async function updateSessionTopic(sessionId: string, topic: string) {
  try {
    const { error } = await supabase.rpc('update_session_topic', { 
      log_id: sessionId, 
      topic 
    });
    
    if (error) {
      console.error('Error updating session topic:', error);
    }
  } catch (error) {
    console.error('Error in updateSessionTopic:', error);
  }
}

export async function incrementQueryCount(sessionId: string) {
  try {
    const { error } = await supabase.rpc('increment_session_query_count', { 
      log_id: sessionId 
    });
    
    if (error) {
      console.error('Error incrementing query count:', error);
    }
  } catch (error) {
    console.error('Error in incrementQueryCount:', error);
  }
}

export async function endSessionLog(sessionId: string, performanceData?: any) {
  try {
    const { error } = await supabase.rpc('end_session_log', { 
      log_id: sessionId,
      performance_data: performanceData ? JSON.stringify(performanceData) : null
    });
    
    if (error) {
      console.error('Error ending session log:', error);
    }
  } catch (error) {
    console.error('Error in endSessionLog:', error);
  }
}
