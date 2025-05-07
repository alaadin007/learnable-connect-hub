
/**
 * Session Logger - Utility to track authentication and session events
 * Used for debugging authentication issues
 */

interface SessionEvent {
  event: string;
  timestamp: number;
  details?: any;
}

class SessionLogger {
  private events: SessionEvent[] = [];
  private maxEvents: number = 100;
  private sessionId: string | null = null;
  
  constructor() {
    // Initialize with a log to mark when the logger was created
    this.logEvent('logger_initialized');
  }
  
  logEvent(event: string, details?: any): void {
    // Store event with timestamp
    this.events.push({
      event,
      timestamp: Date.now(),
      details: details || null
    });
    
    // Trim events if we exceed the maximum
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SessionLogger] ${event}`, details || '');
    }
  }
  
  getEvents(): SessionEvent[] {
    return [...this.events];
  }
  
  clearEvents(): void {
    this.events = [];
    this.logEvent('events_cleared');
  }
  
  // Methods needed for chat interfaces
  startSession(topic?: string): string {
    // Generate a simple session ID
    this.sessionId = `session_${Date.now()}`;
    this.logEvent('session_started', { sessionId: this.sessionId, topic });
    return this.sessionId;
  }
  
  endSession(sessionId?: string): void {
    const id = sessionId || this.sessionId;
    this.logEvent('session_ended', { sessionId: id });
    if (id === this.sessionId) {
      this.sessionId = null;
    }
  }
  
  updateTopic(topic: string, sessionId?: string): void {
    const id = sessionId || this.sessionId;
    this.logEvent('topic_updated', { sessionId: id, topic });
  }
  
  incrementQuery(sessionId?: string): void {
    const id = sessionId || this.sessionId;
    this.logEvent('query_incremented', { sessionId: id });
  }
  
  // For analyzing session status
  getCurrentSessionId(): string | null {
    return this.sessionId;
  }
  
  // Debugging helper to print the event history to console
  printEventHistory(): void {
    console.log('=== Session Event History ===');
    this.events.forEach((event, i) => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      console.log(`${i + 1}. [${time}] ${event.event}`, event.details || '');
    });
    console.log('===========================');
  }
}

// Export a singleton instance
export const sessionLogger = new SessionLogger();
