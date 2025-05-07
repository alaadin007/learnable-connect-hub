
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

// Define types for session logger
export interface SessionLogEvent {
  type: string;
  data?: any;
  timestamp?: string;
}

export interface SessionLogData {
  id: string;
  user_id: string;
  school_id: string | null;
  topic_or_content_used: string | null;
  num_queries: number;
  session_start: string;
  session_end: string | null;
}

export interface SessionLogger {
  startSession(topic?: string): Promise<string | null>;
  endSession(sessionId: string): Promise<void>;
  updateTopic(sessionId: string, topic: string): Promise<void>;
  incrementQuery(sessionId: string): Promise<void>;
  logEvent(eventType: string, eventData?: any): void;
}

class SessionLoggerImpl implements SessionLogger {
  private async logToDatabase(event: SessionLogEvent): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("session_events").insert({
        user_id: user.id,
        event_type: event.type,
        event_data: event.data,
        timestamp: event.timestamp || new Date().toISOString()
      });
    } catch (error) {
      console.error("Error logging event:", error);
    }
  }

  async startSession(topic?: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        return null;
      }

      // Get school_id from the user's profile
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching user profile:", profileError);
      }

      const schoolId = data?.school_id || null;
      const sessionId = uuidv4();
      
      const { error: logError } = await supabase
        .from("session_logs")
        .insert([{
          id: sessionId,
          user_id: user.id,
          school_id: schoolId,
          topic_or_content_used: topic || null,
          session_start: new Date().toISOString()
        }]);

      if (logError) {
        console.error("Error creating session log:", logError);
        return null;
      }

      this.logEvent('session_started', { sessionId, topic });
      return sessionId;
    } catch (error) {
      console.error("Error starting session:", error);
      return null;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("session_logs")
        .update({ session_end: new Date().toISOString() })
        .eq("id", sessionId);

      if (error) {
        console.error("Error ending session:", error);
      } else {
        this.logEvent('session_ended', { sessionId });
      }
    } catch (error) {
      console.error("Error in endSession:", error);
    }
  }

  async updateTopic(sessionId: string, topic: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("session_logs")
        .update({ topic_or_content_used: topic })
        .eq("id", sessionId);

      if (error) {
        console.error("Error updating topic:", error);
      } else {
        this.logEvent('topic_updated', { sessionId, topic });
      }
    } catch (error) {
      console.error("Error in updateTopic:", error);
    }
  }

  async incrementQuery(sessionId: string): Promise<void> {
    try {
      // First, get the current count
      const { data, error: fetchError } = await supabase
        .from("session_logs")
        .select("num_queries")
        .eq("id", sessionId)
        .single();

      if (fetchError) {
        console.error("Error fetching query count:", fetchError);
        return;
      }

      const currentCount = data?.num_queries || 0;

      // Increment the count
      const { error: updateError } = await supabase
        .from("session_logs")
        .update({ num_queries: currentCount + 1 })
        .eq("id", sessionId);

      if (updateError) {
        console.error("Error incrementing query count:", updateError);
      } else {
        this.logEvent('query_incremented', { sessionId, newCount: currentCount + 1 });
      }
    } catch (error) {
      console.error("Error in incrementQuery:", error);
    }
  }

  logEvent(eventType: string, eventData?: any): void {
    const event: SessionLogEvent = {
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString()
    };
    this.logToDatabase(event);
  }
}

export const sessionLogger = new SessionLoggerImpl();

// For backward compatibility
export default sessionLogger;
