
import { supabase } from "@/integrations/supabase/client";

export interface SessionLogOptions {
  topic?: string;
  contentId?: string;
}

export interface PerformanceMetric {
  score?: number;
  completionRate?: number;
  timeSpent?: number;
  mistakes?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

class SessionLogger {
  private currentSessionId: string | null = null;
  private sessionActive = false;

  /**
   * Start a new learning session
   */
  async startSession(options?: SessionLogOptions): Promise<string | null> {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        return null;
      }
      
      // Get the school ID for this user
      const { data: userData } = await supabase
        .from('students')
        .select('school_id')
        .eq('id', user.id)
        .single();
        
      if (!userData?.school_id) {
        console.error("No school ID found for user");
        return null;
      }
      
      // Create the session log
      const { data, error } = await supabase
        .from('session_logs')
        .insert({
          user_id: user.id,
          school_id: userData.school_id,
          topic_or_content_used: options?.topic || null
        })
        .select('id')
        .single();

      if (error) {
        console.error("Error starting session:", error);
        return null;
      }

      if (data?.id) {
        this.currentSessionId = data.id;
        this.sessionActive = true;
        return data.id;
      }
      
      return null;
    } catch (error) {
      console.error("Failed to start session:", error);
      return null;
    }
  }

  /**
   * End the current session
   */
  async endSession(performanceMetrics?: PerformanceMetric): Promise<boolean> {
    if (!this.isSessionActive()) return false;
    
    try {
      const { error } = await supabase
        .from('session_logs')
        .update({
          session_end: new Date().toISOString(), // Convert Date to ISO string
          performance_metric: performanceMetrics as unknown as Record<string, any> // Cast to compatible JSON type
        })
        .eq('id', this.currentSessionId);
      
      if (error) {
        console.error("Error ending session:", error);
        return false;
      }
      
      this.sessionActive = false;
      return true;
    } catch (error) {
      console.error("Failed to end session:", error);
      return false;
    }
  }

  /**
   * Log a query in the current session
   */
  async logQuery(): Promise<boolean> {
    if (!this.isSessionActive()) return false;

    try {
      // First get current query count
      const { data, error: fetchError } = await supabase
        .from('session_logs')
        .select('num_queries')
        .eq('id', this.currentSessionId)
        .single();
        
      if (fetchError) {
        console.error("Error fetching session data:", fetchError);
        return false;
      }
      
      // Then increment it
      const { error: updateError } = await supabase
        .from('session_logs')
        .update({
          num_queries: (data?.num_queries || 0) + 1
        })
        .eq('id', this.currentSessionId);

      if (updateError) {
        console.error("Error logging query:", updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to log query:", error);
      return false;
    }
  }

  /**
   * Update the session topic
   */
  async updateTopic(topic: string): Promise<boolean> {
    if (!this.isSessionActive()) return false;

    try {
      const { error } = await supabase
        .from('session_logs')
        .update({
          topic_or_content_used: topic
        })
        .eq('id', this.currentSessionId);

      if (error) {
        console.error("Error updating topic:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to update topic:", error);
      return false;
    }
  }

  /**
   * Check if a session is currently active
   */
  isSessionActive(): boolean {
    return this.sessionActive && !!this.currentSessionId;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.currentSessionId;
  }
}

export const sessionLogger = new SessionLogger();
export default sessionLogger;
