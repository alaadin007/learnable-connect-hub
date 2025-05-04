
import { supabase } from "@/integrations/supabase/client";

interface PerformanceMetric {
  accuracy?: number;
  completionTime?: number;
  score?: number;
}

export interface SessionLogOptions {
  topic?: string;
}

class SessionLogger {
  private currentSessionId: string | null = null;
  private sessionActive = false;

  // Start a new learning session
  async startSession(options: SessionLogOptions = {}): Promise<string | null> {
    try {
      // Only start a new session if one isn't already active
      if (this.sessionActive) {
        console.warn("Session already active, not starting a new one.");
        return this.currentSessionId;
      }

      // Call the edge function to create a new session log
      const { data, error } = await supabase.functions.invoke("create-session-log", {
        body: {
          topic: options.topic || null,
        }
      });

      if (error) {
        console.error("Error creating session log:", error);
        return null;
      }

      // Store the session ID for later use
      this.currentSessionId = data.logId;
      this.sessionActive = true;
      
      console.log(`Session started with ID: ${this.currentSessionId}`);
      return this.currentSessionId;
    } catch (err) {
      console.error("Unexpected error starting session:", err);
      return null;
    }
  }

  // End the current session
  async endSession(performanceData: PerformanceMetric | null = null): Promise<boolean> {
    try {
      // Only end the session if one is active
      if (!this.sessionActive || !this.currentSessionId) {
        console.warn("No active session to end.");
        return false;
      }

      // Call the edge function to end the session log
      const { error } = await supabase.functions.invoke("end-session", {
        body: {
          logId: this.currentSessionId,
          performanceData: performanceData
        }
      });

      if (error) {
        console.error("Error ending session log:", error);
        return false;
      }

      console.log(`Session ${this.currentSessionId} ended successfully.`);
      
      // Reset session state
      this.sessionActive = false;
      this.currentSessionId = null;
      
      return true;
    } catch (err) {
      console.error("Unexpected error ending session:", err);
      return false;
    }
  }

  // Log a query during the session
  async logQuery(): Promise<boolean> {
    try {
      // Only log query if a session is active
      if (!this.sessionActive || !this.currentSessionId) {
        console.warn("No active session to log query.");
        return false;
      }

      // Call the edge function to increment the query count
      const { error } = await supabase.functions.invoke("update-session", {
        body: {
          log_id: this.currentSessionId,
          action: "increment_query"
        }
      });

      if (error) {
        console.error("Error logging query:", error);
        return false;
      }

      console.log("Query logged successfully.");
      return true;
    } catch (err) {
      console.error("Unexpected error logging query:", err);
      return false;
    }
  }

  // Update the topic for an active session
  async updateTopic(topic: string): Promise<boolean> {
    try {
      // Only update topic if a session is active
      if (!this.sessionActive || !this.currentSessionId) {
        console.warn("No active session to update topic.");
        return false;
      }

      // Call the edge function to update the topic
      const { error } = await supabase.functions.invoke("update-session", {
        body: {
          log_id: this.currentSessionId,
          topic: topic
        }
      });

      if (error) {
        console.error("Error updating session topic:", error);
        return false;
      }

      console.log(`Session topic updated to: ${topic}`);
      return true;
    } catch (err) {
      console.error("Unexpected error updating topic:", err);
      return false;
    }
  }

  // Get current session ID
  getSessionId(): string | null {
    return this.currentSessionId;
  }

  // Check if there is an active session
  isSessionActive(): boolean {
    return this.sessionActive;
  }
}

// Export singleton instance
export const sessionLogger = new SessionLogger();

export default sessionLogger;
