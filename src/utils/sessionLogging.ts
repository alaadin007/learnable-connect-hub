
import { supabase } from "@/integrations/supabase/client";

interface SessionLogPerformanceMetrics {
  score?: number;
  completionTime?: number;
  correctAnswers?: number;
  totalQuestions?: number;
  [key: string]: any; // Allow for additional custom metrics
}

/**
 * Class for managing session logging functionality
 */
export class SessionLogger {
  private logId: string | null = null;
  private sessionActive: boolean = false;

  /**
   * Initialize a new session log
   * @param topic Optional topic or content being studied
   * @returns Promise resolving to the log ID
   */
  async startSession(topic?: string): Promise<string> {
    if (this.sessionActive) {
      console.warn('Session already active, ending current session before starting a new one');
      await this.endSession();
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-session-log', {
        body: { topic }
      });

      if (error) {
        console.error('Error starting session:', error);
        throw new Error(error.message || 'Failed to start session');
      }

      this.logId = data.logId;
      this.sessionActive = true;
      console.log('Started session with ID:', this.logId);
      return this.logId;
    } catch (err) {
      console.error('Error in startSession:', err);
      throw err;
    }
  }

  /**
   * Record a query to the active session
   * @returns Promise resolving when the query is recorded
   */
  async recordQuery(): Promise<void> {
    if (!this.logId || !this.sessionActive) {
      console.warn('No active session to record query');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('update-session', {
        body: { 
          logId: this.logId,
          action: 'increment_query'
        }
      });

      if (error) {
        console.error('Error recording query:', error);
        throw new Error(error.message || 'Failed to record query');
      }
    } catch (err) {
      console.error('Error in recordQuery:', err);
      throw err;
    }
  }

  /**
   * Update the topic or content for the active session
   * @param topic The topic or content being studied
   * @returns Promise resolving when the topic is updated
   */
  async updateTopic(topic: string): Promise<void> {
    if (!this.logId || !this.sessionActive) {
      console.warn('No active session to update topic');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('update-session', {
        body: { 
          logId: this.logId,
          action: 'update_topic',
          topic 
        }
      });

      if (error) {
        console.error('Error updating topic:', error);
        throw new Error(error.message || 'Failed to update topic');
      }
    } catch (err) {
      console.error('Error in updateTopic:', err);
      throw err;
    }
  }

  /**
   * End the active session and record performance metrics
   * @param performanceMetrics Optional performance metrics to record
   * @returns Promise resolving when the session is ended
   */
  async endSession(performanceMetrics?: SessionLogPerformanceMetrics): Promise<void> {
    if (!this.logId || !this.sessionActive) {
      console.warn('No active session to end');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('end-session', {
        body: { 
          logId: this.logId,
          performanceMetrics
        }
      });

      if (error) {
        console.error('Error ending session:', error);
        throw new Error(error.message || 'Failed to end session');
      }

      this.sessionActive = false;
      console.log('Ended session with ID:', this.logId);
    } catch (err) {
      console.error('Error in endSession:', err);
      throw err;
    }
  }

  /**
   * Get the current session log ID
   * @returns The current log ID or null if no session is active
   */
  getLogId(): string | null {
    return this.logId;
  }

  /**
   * Check if a session is currently active
   * @returns True if a session is active, false otherwise
   */
  isSessionActive(): boolean {
    return this.sessionActive;
  }

  /**
   * Create and return a new instance of SessionLogger
   * @returns A new SessionLogger instance
   */
  static createLogger(): SessionLogger {
    return new SessionLogger();
  }
}

// Create a default exported instance for simple usage
export const sessionLogger = new SessionLogger();

// Also export the class for more advanced usage patterns
export default sessionLogger;
