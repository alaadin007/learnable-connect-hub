
import { sessionLogger } from "./sessionLogger";

// Export the sessionLogger instance for use across the app
export { sessionLogger };

// Helper function to log an event with details
export const logEvent = (event: string, details?: any): void => {
  sessionLogger.logEvent(event, details);
};

// Helper function to get all stored events
export const getSessionEvents = (): any[] => {
  return sessionLogger.getEvents();
};

// Helper to clear events
export const clearSessionEvents = (): void => {
  sessionLogger.clearEvents();
};

// Helper to print event history to console (useful for debugging)
export const printSessionEventHistory = (): void => {
  sessionLogger.printEventHistory();
};

// Helper for chat sessions
export const startSessionLog = (topic?: string): string => {
  return sessionLogger.startSession(topic);
};

export const endSessionLog = (sessionId?: string): void => {
  sessionLogger.endSession(sessionId);
};

export const updateSessionTopic = (topic: string, sessionId?: string): void => {
  sessionLogger.updateTopic(topic, sessionId);
};

export const incrementSessionQuery = (sessionId?: string): void => {
  sessionLogger.incrementQuery(sessionId);
};
