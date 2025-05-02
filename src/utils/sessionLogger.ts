
// Import necessary functions from sessionLogging
import { logSessionStart, logSessionEnd, updateSessionTopic, incrementQueryCount } from './sessionLogging';

// Create a wrapper object to match what the components expect
export const sessionLogger = {
  // Start a session - expects topic and userId parameters
  startSession: async (topic: string, userId: string): Promise<string | null> => {
    // Get the school ID (in a real app this would be from context or user profile)
    const mockSchoolId = sessionStorage.getItem('testUserSchoolId') || 'default-school';
    return logSessionStart(userId, mockSchoolId);
  },
  
  // End a session - can take sessionId (optional)
  endSession: async (sessionId: string, additionalInfo?: Record<string, any>): Promise<boolean> => {
    return logSessionEnd(sessionId);
  },
  
  // Update topic - takes sessionId and optional topic parameters
  updateTopic: async (sessionId: string, topic?: string): Promise<boolean> => {
    return updateSessionTopic(topic || '', sessionId);
  },
  
  // Increment query count - takes sessionId parameter
  incrementQueryCount: async (sessionId: string): Promise<boolean> => {
    return incrementQueryCount(sessionId);
  },
  
  // Check if there's an active session
  hasActiveSession: (): boolean => {
    return !!sessionStorage.getItem('activeSessionId');
  }
};
