
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

class SessionLogger {
  async startSession(topic?: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        return null;
      }

      // Get school_id from the user's profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
      }

      const sessionId = uuidv4();
      
      const { error: logError } = await supabase
        .from("session_logs")
        .insert([{
          id: sessionId,
          user_id: user.id,
          school_id: profile?.school_id || null,
          topic_or_content_used: topic || null
        }]);

      if (logError) {
        console.error("Error creating session log:", logError);
        return null;
      }

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
      }
    } catch (error) {
      console.error("Error in incrementQuery:", error);
    }
  }
}

export const sessionLogger = new SessionLogger();

// For backward compatibility
export default sessionLogger;
