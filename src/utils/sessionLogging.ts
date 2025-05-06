
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

// Log session activity
export async function logSessionActivity(payload: {
  userId: string;
  activityType: string;
  details?: Record<string, any>;
}) {
  try {
    const { userId, activityType, details = {} } = payload;

    const { error } = await supabase
      .from('session_logs')
      .insert({
        id: uuidv4(),
        user_id: userId,
        activity_type: activityType,
        details: details,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging session activity:', error);
    }

    return !error;
  } catch (error) {
    console.error('Failed to log session activity:', error);
    return false;
  }
}

// Log user interaction with AI
export async function logAIInteraction(payload: {
  userId: string;
  query: string;
  responseLength?: number;
  model?: string;
  success?: boolean;
  details?: Record<string, any>;
}) {
  try {
    const { userId, query, responseLength = 0, model = 'unknown', success = true, details = {} } = payload;
    
    return await logSessionActivity({
      userId,
      activityType: 'ai_interaction',
      details: {
        query,
        responseLength,
        model,
        success,
        ...details
      }
    });
  } catch (error) {
    console.error('Failed to log AI interaction:', error);
    return false;
  }
}

// Log error event
export async function logError(payload: {
  userId: string;
  errorType: string;
  errorMessage: string;
  details?: Record<string, any>;
}) {
  try {
    const { userId, errorType, errorMessage, details = {} } = payload;
    
    return await logSessionActivity({
      userId,
      activityType: 'error',
      details: {
        errorType,
        errorMessage,
        ...details
      }
    });
  } catch (error) {
    console.error('Failed to log error:', error);
    return false;
  }
}

export default {
  logSessionActivity,
  logAIInteraction,
  logError
};
