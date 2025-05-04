
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
      // Create the session log using a Supabase function
      const { data, error } = await supabase.functions.invoke('create-session-log', {
        body: { topic: options?.topic || null }
      });

      if (error) {
        console.error("Error starting session:", error);
        return null;
      }

      if (data?.session_id) {
        this.currentSessionId = data.session_id;
        this.sessionActive = true;
        return data.session_id;
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
      const { error } = await supabase.functions.invoke('end-session', {
        body: { 
          sessionId: this.currentSessionId,
          performanceMetrics
        }
      });
      
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
      const { error } = await supabase.functions.invoke('update-session', {
        body: { 
          sessionId: this.currentSessionId,
          incrementQuery: true
        }
      });

      if (error) {
        console.error("Error logging query:", error);
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
      const { error } = await supabase.functions.invoke('update-session', {
        body: { 
          sessionId: this.currentSessionId,
          topic
        }
      });

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
