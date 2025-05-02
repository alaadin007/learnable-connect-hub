
import { supabase } from "@/integrations/supabase/client";

type PerformanceData = {
  completedTime?: string;
  score?: number;
  questionsAnswered?: number;
  conversationsViewed?: number;
  [key: string]: any;
};

class SessionLogger {
  private sessionId: string | null = null;
  private isTestSession: boolean = false;
  
  constructor() {
    // Check if there's an active session ID in session storage when initializing
    const activeSessionId = sessionStorage.getItem('activeSessionId');
    if (activeSessionId) {
      this.sessionId = activeSessionId;
      this.isTestSession = true;
    }
  }

  async createSession(topic?: string): Promise<string> {
    // Check if this is a test user
    const testUser = sessionStorage.getItem('testUser');
    
    if (testUser) {
      // For test users, create a fake session ID
      const mockSessionId = `test-session-${Date.now()}`;
      this.sessionId = mockSessionId;
      this.isTestSession = true;
      
      // Store the session ID in session storage
      sessionStorage.setItem('activeSessionId', mockSessionId);
      
      console.log('Test session created:', mockSessionId);
      return mockSessionId;
    }
    
    // For real users, call the Supabase function
    try {
      const { data, error } = await supabase.functions.invoke('create-session-log', {
        body: { topic }
      });
      
      if (error) throw new Error(error.message);
      
      this.sessionId = data;
      return data;
    } catch (error: any) {
      console.error('Error creating session log:', error);
      throw error;
    }
  }

  async updateTopic(topic: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session to update');
    }
    
    if (this.isTestSession) {
      console.log(`Test session ${this.sessionId} topic updated to: ${topic}`);
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('update-session', {
        body: { 
          log_id: this.sessionId,
          topic 
        }
      });
      
      if (error) throw new Error(error.message);
    } catch (error: any) {
      console.error('Error updating session topic:', error);
      throw error;
    }
  }

  async incrementQueryCount(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }
    
    if (this.isTestSession) {
      console.log(`Test session ${this.sessionId} query count incremented`);
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('update-session', {
        body: { 
          log_id: this.sessionId,
          increment_query: true 
        }
      });
      
      if (error) throw new Error(error.message);
    } catch (error: any) {
      console.error('Error incrementing query count:', error);
      throw error;
    }
  }

  async endSession(performanceData?: PerformanceData): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session to end');
    }
    
    if (this.isTestSession) {
      console.log(`Test session ${this.sessionId} ended with performance data:`, performanceData);
      
      // Clear session from storage
      sessionStorage.removeItem('activeSessionId');
      this.sessionId = null;
      this.isTestSession = false;
      return;
    }
    
    try {
      const { error } = await supabase.functions.invoke('end-session', {
        body: { 
          log_id: this.sessionId,
          performance_data: performanceData 
        }
      });
      
      if (error) throw new Error(error.message);
      
      // Clear the session ID after ending the session
      this.sessionId = null;
    } catch (error: any) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  hasActiveSession(): boolean {
    return this.sessionId !== null;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}

export const sessionLogger = new SessionLogger();
