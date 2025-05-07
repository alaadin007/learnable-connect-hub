
// A simple session logger for tracking auth events
import { createSessionLog, endSessionLog, updateSessionTopic } from "./analytics/sessionUtils";

class SessionLogger {
  private isDevMode: boolean;
  private sessionEvents: Array<{timestamp: Date, event: string, details?: any}> = [];
  private maxEvents: number = 100;
  
  constructor() {
    this.isDevMode = process.env.NODE_ENV === 'development';
  }
  
  /**
   * Log an authentication event
   */
  logEvent(event: string, details?: any): void {
    // Add to history
    this.sessionEvents.unshift({
      timestamp: new Date(),
      event,
      details
    });
    
    // Trim history if too long
    if (this.sessionEvents.length > this.maxEvents) {
      this.sessionEvents = this.sessionEvents.slice(0, this.maxEvents);
    }
    
    // Log in dev mode
    if (this.isDevMode) {
      console.log(`[Auth Session] ${event}`, details || '');
    }
  }
  
  /**
   * Start a new session and return the session ID
   */
  async startSession(topic?: string): Promise<string | null> {
    try {
      const sessionId = await createSessionLog(topic);
      this.logEvent('session_started', { sessionId, topic });
      return sessionId;
    } catch (error) {
      this.logEvent('session_start_failed', { error });
      console.error('Error starting session:', error);
      return null;
    }
  }
  
  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      await endSessionLog(sessionId);
      this.logEvent('session_ended', { sessionId });
    } catch (error) {
      this.logEvent('session_end_failed', { sessionId, error });
      console.error('Error ending session:', error);
    }
  }
  
  /**
   * Update the topic of a session
   */
  async updateTopic(sessionId: string, topic: string): Promise<void> {
    try {
      await updateSessionTopic(sessionId, topic);
      this.logEvent('topic_updated', { sessionId, topic });
    } catch (error) {
      this.logEvent('topic_update_failed', { sessionId, topic, error });
      console.error('Error updating topic:', error);
    }
  }
  
  /**
   * Increment query count for a session
   */
  async incrementQuery(sessionId: string): Promise<void> {
    try {
      // For now, we just log the event. In the future, we could update a count in the database
      this.logEvent('query_incremented', { sessionId });
    } catch (error) {
      this.logEvent('query_increment_failed', { sessionId, error });
      console.error('Error incrementing query:', error);
    }
  }
  
  /**
   * Get the history of events
   */
  getHistory(): Array<{timestamp: Date, event: string, details?: any}> {
    return [...this.sessionEvents];
  }
  
  /**
   * Clear the history of events
   */
  clearHistory(): void {
    this.sessionEvents = [];
  }
  
  /**
   * Debug helper to check for common auth issues
   */
  checkForAuthIssues(): {hasIssues: boolean, issues: string[]} {
    const issues: string[] = [];
    
    // Check local storage for auth items
    try {
      const hasAuthKey = !!localStorage.getItem('sb-ldlgckwkdsvrfuymidrr-auth-token');
      if (!hasAuthKey) {
        issues.push('Missing auth token in localStorage');
      }
    } catch (e) {
      issues.push(`localStorage access error: ${e}`);
    }
    
    // Check for suspicious auth events
    const recentEvents = this.sessionEvents.slice(0, 10);
    const signOutCount = recentEvents.filter(e => e.event.includes('sign out') || e.event.includes('signed out')).length;
    if (signOutCount > 2) {
      issues.push('Multiple sign-out events detected recently');
    }
    
    // Look for error events
    const errorEvents = recentEvents.filter(e => e.event.includes('error') || e.event.includes('failed'));
    if (errorEvents.length > 0) {
      issues.push(`${errorEvents.length} auth error events detected recently`);
    }
    
    return {
      hasIssues: issues.length > 0,
      issues
    };
  }
  
  /**
   * Get auth session status from localStorage
   */
  getStoredSessionInfo(): {exists: boolean, expiry?: Date} {
    try {
      const tokenData = localStorage.getItem('sb-ldlgckwkdsvrfuymidrr-auth-token');
      if (!tokenData) {
        return {exists: false};
      }
      
      const parsed = JSON.parse(tokenData);
      if (parsed.expiresAt) {
        return {
          exists: true,
          expiry: new Date(parsed.expiresAt * 1000)
        };
      }
      
      return {exists: true};
    } catch (e) {
      return {exists: false};
    }
  }
}

export const sessionLogger = new SessionLogger();
export default sessionLogger;
