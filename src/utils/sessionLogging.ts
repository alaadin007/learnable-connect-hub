
import { supabase } from "@/integrations/supabase/client";

interface PerformanceMetric {
  [key: string]: number | string | boolean | object;
}

class SessionLogger {
  private currentSessionId: string | null = null;
  
  /**
   * Start a new session log
   * @param topic Optional topic for the session
   * @returns Promise with the session ID
   */
  async startSession(topic?: string): Promise<string> {
    try {
      const response = await supabase.functions.invoke('create-session-log', {
        body: { topic }
      });
      
      if (response.error) {
        console.error("Error starting session:", response.error);
        throw new Error(response.error.message);
      }
      
      this.currentSessionId = response.data.logId;
      return this.currentSessionId;
    } catch (error) {
      console.error("Failed to start session log:", error);
      throw error;
    }
  }
  
  /**
   * Increment the query count for the current session
   */
  async incrementQueryCount(): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error("No active session");
    }
    
    try {
      const response = await supabase.functions.invoke('update-session', {
        body: { 
          logId: this.currentSessionId, 
          action: 'increment_query' 
        }
      });
      
      if (response.error) {
        console.error("Error incrementing query count:", response.error);
        throw new Error(response.error.message);
      }
    } catch (error) {
      console.error("Failed to increment query count:", error);
      throw error;
    }
  }
  
  /**
   * Update the topic for the current session
   * @param topic New topic
   */
  async updateTopic(topic: string): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error("No active session");
    }
    
    try {
      const response = await supabase.functions.invoke('update-session', {
        body: { 
          logId: this.currentSessionId, 
          action: 'update_topic',
          topic 
        }
      });
      
      if (response.error) {
        console.error("Error updating topic:", response.error);
        throw new Error(response.error.message);
      }
    } catch (error) {
      console.error("Failed to update topic:", error);
      throw error;
    }
  }
  
  /**
   * End the current session
   * @param performanceMetrics Optional performance metrics to record
   */
  async endSession(performanceMetrics?: PerformanceMetric): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error("No active session");
    }
    
    try {
      const response = await supabase.functions.invoke('end-session', {
        body: { 
          logId: this.currentSessionId,
          performanceData: performanceMetrics
        }
      });
      
      if (response.error) {
        console.error("Error ending session:", response.error);
        throw new Error(response.error.message);
      }
      
      this.currentSessionId = null;
    } catch (error) {
      console.error("Failed to end session:", error);
      throw error;
    }
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.currentSessionId;
  }
  
  /**
   * Check if there is an active session
   */
  hasActiveSession(): boolean {
    return this.currentSessionId !== null;
  }
}

// Export a singleton instance
export const sessionLogger = new SessionLogger();

// Also export the class for testing or creating additional instances
export default SessionLogger;
