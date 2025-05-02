
import { logSessionStart, logSessionEnd, updateSessionTopic, incrementQueryCount } from './sessionLogging';

// Create a wrapper object to match what the components expect
export const sessionLogger = {
  startSession: logSessionStart,
  endSession: logSessionEnd,
  updateTopic: updateSessionTopic,
  incrementQueryCount: incrementQueryCount
};
