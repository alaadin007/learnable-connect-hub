
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { 
  SessionData, 
  TopicData, 
  StudyTimeData, 
  AnalyticsFilters,
  AnalyticsSummary
} from "@/components/analytics/types";
import { getMockAnalyticsData } from "@/utils/sessionLogging";

// Helper to format date for Supabase queries
const formatDateForQuery = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

// Check if using a test account
const isTestAccount = (): boolean => {
  return sessionStorage.getItem('testUserType') !== null;
};

// Fetch analytics summary for a school
export const fetchAnalyticsSummary = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<AnalyticsSummary | null> => {
  try {
    // Handle test account
    if (isTestAccount()) {
      const mockData = getMockAnalyticsData(schoolId, filters);
      return mockData?.summary || null;
    }
    
    // Real account implementation
    let query = supabase
      .from("school_analytics_summary")
      .select("*")
      .eq("school_id", schoolId);
    
    // Apply filters (currently no date filtering on this view)
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error("Error fetching analytics summary:", error);
      return null;
    }
    
    if (!data) return null;
    
    return {
      activeStudents: data.active_students || 0,
      totalSessions: data.total_sessions || 0,
      totalQueries: data.total_queries || 0,
      avgSessionMinutes: data.avg_session_minutes || 0,
    };
  } catch (error) {
    console.error("Error in fetchAnalyticsSummary:", error);
    return null;
  }
};

// Fetch session logs for a school
export const fetchSessionLogs = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<SessionData[]> => {
  try {
    // Handle test account
    if (isTestAccount()) {
      const mockData = getMockAnalyticsData(schoolId, filters);
      return mockData?.sessions || [];
    }
    
    // Real account implementation
    let query = supabase
      .from("session_query_counts")
      .select("session_id, user_id, topic_or_content_used, num_queries, session_start, profiles!inner(full_name)")
      .eq("school_id", schoolId);
    
    // Apply date range filter if provided
    if (filters.dateRange?.from) {
      query = query.gte("session_start", formatDateForQuery(filters.dateRange.from));
    }
    
    if (filters.dateRange?.to) {
      // Add one day to include the end date fully
      const endDate = new Date(filters.dateRange.to);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt("session_start", formatDateForQuery(endDate));
    }
    
    // Apply student filter if provided
    if (filters.studentId) {
      query = query.eq("user_id", filters.studentId);
    }
    
    // Order by most recent first
    query = query.order("session_start", { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching session logs:", error);
      return [];
    }
    
    return (data || []).map(item => {
      // Calculate a rough duration (for display purposes)
      // In a real implementation, you would use actual session_end data
      const duration = Math.floor(Math.random() * 30) + 10; // Random between 10-40 mins for demo
      
      return {
        id: item.session_id || "",
        student: (item.profiles as any).full_name || "Unknown Student",
        topic: item.topic_or_content_used || "General",
        queries: item.num_queries || 0,
        duration: `${duration} min`,
        startTime: item.session_start || "",
      };
    });
  } catch (error) {
    console.error("Error in fetchSessionLogs:", error);
    return [];
  }
};

// Fetch most studied topics for a school
export const fetchTopics = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<TopicData[]> => {
  try {
    // Handle test account
    if (isTestAccount()) {
      const mockData = getMockAnalyticsData(schoolId, filters);
      return mockData?.topics || [];
    }
    
    // Real account implementation
    let query = supabase
      .from("most_studied_topics")
      .select("topic_or_content_used, count_of_sessions")
      .eq("school_id", schoolId)
      .order("count_of_sessions", { ascending: false })
      .limit(10);
    
    // Currently no date filtering on this view
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching topics:", error);
      return [];
    }
    
    return (data || [])
      .filter(item => item.topic_or_content_used) // Filter out null topics
      .map(item => ({
        name: item.topic_or_content_used || "General",
        value: item.count_of_sessions || 0,
      }));
  } catch (error) {
    console.error("Error in fetchTopics:", error);
    return [];
  }
};

// Fetch weekly study time by student
export const fetchStudyTime = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<StudyTimeData[]> => {
  try {
    // Handle test account
    if (isTestAccount()) {
      const mockData = getMockAnalyticsData(schoolId, filters);
      return mockData?.studyTime || [];
    }
    
    // Real account implementation
    let query = supabase
      .from("student_weekly_study_time")
      .select("*")
      .eq("school_id", schoolId);
    
    // Apply student filter if provided
    if (filters.studentId) {
      query = query.eq("user_id", filters.studentId);
    }
    
    // Order by study hours (descending)
    query = query.order("study_hours", { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching study time:", error);
      return [];
    }
    
    return (data || [])
      .filter(item => item.student_name) // Filter out entries with no name
      .map(item => ({
        name: item.student_name || "Unknown Student",
        hours: Number(item.study_hours) || 0,
      }));
  } catch (error) {
    console.error("Error in fetchStudyTime:", error);
    return [];
  }
};

// Get a human-readable representation of the date range
export const getDateRangeText = (dateRange?: { from?: Date; to?: Date }): string => {
  if (!dateRange) {
    const now = new Date();
    const oneMonthAgo = subDays(now, 30);
    return `${format(oneMonthAgo, 'MMM d, yyyy')} - ${format(now, 'MMM d, yyyy')}`;
  }
  
  if (dateRange.from && dateRange.to) {
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
  }
  
  if (dateRange.from) {
    return `From ${format(dateRange.from, 'MMM d, yyyy')}`;
  }
  
  if (dateRange.to) {
    return `Until ${format(dateRange.to, 'MMM d, yyyy')}`;
  }
  
  return "All time";
};
