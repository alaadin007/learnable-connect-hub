
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsSummary, SessionData, TopicData, StudyTimeData } from '@/components/analytics/types';

// Define interfaces for better type safety
interface SessionLogResult {
  success: boolean;
  sessionId?: string;
  message?: string;
}

interface PerformanceData {
  duration?: number;
  queries?: number;
  errors?: number;
  [key: string]: any;
}

interface SessionLog {
  id: string;
  topic_or_content_used: string;
  created_at?: string;
  updated_at?: string;
}

interface SupabaseFunctionResponse<T> {
  data: T | null;
  error: {
    message: string;
    status?: number;
  } | null;
}

interface MockAnalyticsParams {
  startDate: string;
  endDate: string;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  sessions: SessionData[];
  topics: TopicData[];
  studyTime: StudyTimeData[];
}

/**
 * Generate mock analytics data for development and testing
 */
export const getMockAnalyticsData = (
  schoolId: string,
  params: MockAnalyticsParams
): AnalyticsData => {
  // Mock summary data
  const summary: AnalyticsSummary = {
    activeStudents: Math.floor(Math.random() * 100) + 50,
    totalSessions: Math.floor(Math.random() * 500) + 200,
    totalQueries: Math.floor(Math.random() * 5000) + 1000,
    avgSessionMinutes: Math.floor(Math.random() * 30) + 10
  };

  // Mock sessions data
  const sessions: SessionData[] = Array.from({ length: 20 }, (_, i) => ({
    id: `session-${i}`,
    userId: `user-${Math.floor(Math.random() * 20) + 1}`,
    userName: `Student ${Math.floor(Math.random() * 20) + 1}`,
    startTime: new Date(
      new Date().getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
    ).toISOString(),
    endTime: new Date(
      new Date().getTime() - Math.floor(Math.random() * 20) * 60 * 60 * 1000
    ).toISOString(),
    duration: Math.floor(Math.random() * 3600) + 600, // 10-70 minutes in seconds
    topicOrContent: ['Math', 'Science', 'History', 'Literature', 'Geography'][
      Math.floor(Math.random() * 5)
    ],
    numQueries: Math.floor(Math.random() * 30) + 5,
    student_name: `Student ${Math.floor(Math.random() * 20) + 1}`,
    student_id: `user-${Math.floor(Math.random() * 20) + 1}`,
    session_date: new Date(
      new Date().getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
    ).toISOString(),
    duration_minutes: Math.floor(Math.random() * 60) + 10,
    topics: [['Math', 'Science', 'History', 'Literature', 'Geography'][
      Math.floor(Math.random() * 5)
    ]],
    questions_asked: Math.floor(Math.random() * 30) + 5,
    questions_answered: Math.floor(Math.random() * 25) + 5,
    topic: ['Math', 'Science', 'History', 'Literature', 'Geography'][
      Math.floor(Math.random() * 5)
    ],
    queries: Math.floor(Math.random() * 30) + 5
  }));

  // Mock topics data
  const topicNames = ['Math', 'Science', 'History', 'Literature', 'Geography', 'Physics', 'Chemistry', 'Biology', 'Art', 'Music'];
  const topics: TopicData[] = topicNames.map((name, i) => ({
    topic: name,
    count: Math.floor(Math.random() * 100) + 10,
    topic_or_content_used: name,
    count_of_sessions: Math.floor(Math.random() * 100) + 10,
    topic_rank: i + 1,
    name: name,
    value: Math.floor(Math.random() * 100) + 10
  }));

  // Mock study time data
  const studyTime: StudyTimeData[] = Array.from({ length: 10 }, (_, i) => ({
    student_name: `Student ${i + 1}`,
    student_id: `user-${i + 1}`,
    study_hours: Math.floor(Math.random() * 50) + 10,
    week: Math.floor(i / 2) + 1,
    year: new Date().getFullYear(),
    studentName: `Student ${i + 1}`,
    name: `Student ${i + 1}`,
    hours: Math.floor(Math.random() * 50) + 10,
    total_minutes: (Math.floor(Math.random() * 50) + 10) * 60,
    session_week: Math.floor(i / 2) + 1,
    session_year: new Date().getFullYear(),
    user_id: `user-${i + 1}`,
    week_number: Math.floor(i / 2) + 1
  }));

  return {
    summary,
    sessions,
    topics,
    studyTime
  };
};

/**
 * Start a new session log
 */
export const startSessionLog = async (topic: string): Promise<SessionLogResult> => {
  try {
    // First try using the function
    const { data, error } = await supabase.functions.invoke<SessionLog>('create-session-log', {
      body: { topic }
    });

    if (error) {
      console.error("Error starting session log:", error);
      return { success: false, message: error.message };
    }

    if (data?.id) {
      return { success: true, sessionId: data.id };
    }

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "User not authenticated" };
    }

    // Get user's school_id
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData?.school_id) {
      console.error("Error getting user profile:", profileError || "No school_id found");
      return { success: false, message: "Could not determine school ID" };
    }

    // Fallback to direct database call if function fails
    const { data: directData, error: directError } = await supabase
      .from('session_logs')
      .insert({
        user_id: user.id,
        school_id: profileData.school_id,
        topic_or_content_used: topic
      })
      .select()
      .single();

    if (directError) {
      console.error("Error starting session (direct):", directError);
      return { success: false, message: directError.message };
    }

    if (!directData?.id) {
      return { success: false, message: "No session ID returned" };
    }

    return { success: true, sessionId: directData.id };
  } catch (error) {
    console.error("Error in startSessionLog:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unexpected error occurred" 
    };
  }
};

/**
 * End an existing session log
 */
export const endSessionLog = async (
  sessionId: string, 
  performanceData?: PerformanceData
): Promise<SessionLogResult> => {
  try {
    const { data, error } = await supabase.functions.invoke<SessionLog>('end-session', {
      body: { 
        session_id: sessionId, 
        performance_data: performanceData 
      }
    });

    if (error) {
      console.error("Error ending session log:", error);
      return { success: false, message: error.message };
    }

    return { success: true, sessionId };
  } catch (error) {
    console.error("Error in endSessionLog:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unexpected error occurred" 
    };
  }
};

/**
 * Update a session topic
 */
export const updateSessionTopic = async (
  sessionId: string, 
  topic: string
): Promise<SessionLogResult> => {
  try {
    const { data, error } = await supabase.functions.invoke<SessionLog>('update-session', {
      body: { 
        session_id: sessionId, 
        topic 
      }
    });

    if (error) {
      console.error("Error updating session topic:", error);
      return { success: false, message: error.message };
    }

    return { success: true, sessionId };
  } catch (error) {
    console.error("Error in updateSessionTopic:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "An unexpected error occurred" 
    };
  }
};

// Create a type-safe session logger object
const sessionLogger = {
  startSessionLog,
  endSessionLog,
  updateSessionTopic
} as const;

export default sessionLogger;
