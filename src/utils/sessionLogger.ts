
// Import necessary functions from sessionLogging
import { logSessionStart, logSessionEnd, updateSessionTopic, incrementQueryCount } from './sessionLogging';

// Create a wrapper object to match what the components expect
const sessionLogger = {
  startSession: logSessionStart,
  endSession: logSessionEnd,
  updateSessionTopic: updateSessionTopic,
  incrementQueryCount: incrementQueryCount,
  hasActiveSession: () => true // Added this function since it's called in ChatWithAI.tsx but wasn't defined
};

export default sessionLogger;
