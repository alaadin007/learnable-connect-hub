
import { createSessionLog, updateSessionTopic, incrementQueryCount, endSessionLog } from './sessionLogging';

// Simple wrapper for session logging functions
const sessionLogger = {
  startSession: async (topic?: string) => {
    try {
      return await createSessionLog(topic);
    } catch (error) {
      console.error('Error starting session:', error);
      return null;
    }
  },
  
  updateTopic: async (sessionId: string, topic: string) => {
    try {
      await updateSessionTopic(sessionId, topic);
    } catch (error) {
      console.error('Error updating session topic:', error);
    }
  },
  
  incrementQuery: async (sessionId: string) => {
    try {
      await incrementQueryCount(sessionId);
    } catch (error) {
      console.error('Error incrementing query count:', error);
    }
  },
  
  endSession: async (sessionId: string, performanceData?: any) => {
    try {
      await endSessionLog(sessionId, performanceData);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }
};

export default sessionLogger;
