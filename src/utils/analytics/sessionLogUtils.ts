
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsFilters, SessionData } from "@/components/analytics/types";
import { getDateFilterSQL } from "./dateUtils";
import { isValidUUID } from "./validationUtils";
import { getMockSessionData } from "./mockDataUtils";

// Fetch session logs for analytics
export const fetchSessionLogs = async (
  schoolId: string | undefined,
  filters: AnalyticsFilters
): Promise<SessionData[]> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for sessions, using demo data");
      return getMockSessionData();
    }

    // Get date range filter
    const { dateRange, teacherId, studentId } = filters;
    const dateFilter = getDateFilterSQL(dateRange);

    // Build the query
    let query = supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        session_start,
        session_end,
        topic_or_content_used,
        num_queries,
        profiles(full_name)
      `)
      .eq('school_id', schoolId)
      .gte('session_start', dateFilter.startDate)
      .lte('session_start', dateFilter.endDate)
      .order('session_start', { ascending: false });

    // Add filters if provided
    if (studentId && isValidUUID(studentId)) {
      query = query.eq('user_id', studentId);
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching session logs:", error);
      return getMockSessionData();
    }

    // Transform data to match expected format
    const sessions: SessionData[] = (data || []).map(session => {
      const startTime = new Date(session.session_start);
      const endTime = session.session_end ? new Date(session.session_end) : new Date(startTime.getTime() + 30 * 60000); // Default to 30 min if no end time
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      // Parse topics (assuming topic_or_content_used might contain multiple topics separated by commas)
      const topicsList = session.topic_or_content_used ? 
        session.topic_or_content_used.split(',').map(t => t.trim()) : 
        ['General'];

      // Safely access profiles data
      const profileData = session.profiles;
      const studentName = profileData ? 
          (Array.isArray(profileData) ? profileData[0]?.full_name : profileData.full_name) || 'Unknown Student' 
          : 'Unknown Student';

      return {
        id: session.id,
        student_id: session.user_id,
        student_name: studentName,
        session_date: session.session_start,
        duration_minutes: durationMinutes > 0 ? durationMinutes : 0,
        topics: topicsList,
        questions_asked: session.num_queries || 0,
        questions_answered: Math.floor((session.num_queries || 0) * 0.9), // Assuming 90% of questions were answered
        
        // Compatibility fields
        userId: session.user_id,
        userName: studentName,
        topic: session.topic_or_content_used || 'General',
        queries: session.num_queries || 0
      };
    });

    return sessions;
  } catch (error) {
    console.error("Error in fetchSessionLogs:", error);
    return getMockSessionData();
  }
};

// Fetch analytics summary for a school
export const fetchAnalyticsSummary = async (
  schoolId: string | undefined,
  filters: AnalyticsFilters
): Promise<{
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for analytics summary, using demo data");
      return {
        activeStudents: 15,
        totalSessions: 42,
        totalQueries: 128,
        avgSessionMinutes: 18
      };
    }

    // Get date range filter
    const { dateRange, teacherId, studentId } = filters;
    const dateFilter = getDateFilterSQL(dateRange);

    // Query to get all session logs matching the filters
    let query = supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        session_start,
        session_end,
        num_queries
      `, { count: 'exact' })
      .eq('school_id', schoolId)
      .gte('session_start', dateFilter.startDate)
      .lte('session_start', dateFilter.endDate);

    // Add filters if provided
    if (studentId && isValidUUID(studentId)) {
      query = query.eq('user_id', studentId);
    }
    
    // Execute the query
    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching session logs for summary:", error);
      return {
        activeStudents: 15,
        totalSessions: 42,
        totalQueries: 128,
        avgSessionMinutes: 18
      };
    }

    // Calculate summary metrics
    const totalSessions = count || 0;
    
    // Count unique students
    const uniqueStudents = new Set((data || []).map(session => session.user_id)).size;
    
    // Sum queries
    const totalQueries = (data || []).reduce((sum, session) => sum + (session.num_queries || 0), 0);
    
    // Calculate average session duration
    let totalMinutes = 0;
    let validSessionsCount = 0;
    
    (data || []).forEach(session => {
      if (session.session_start && session.session_end) {
        const start = new Date(session.session_start);
        const end = new Date(session.session_end);
        const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
        
        // Only count sessions with valid durations
        if (minutes > 0 && minutes < 240) { // Cap at 4 hours max
          totalMinutes += minutes;
          validSessionsCount++;
        }
      }
    });
    
    const avgSessionMinutes = validSessionsCount > 0 ? Math.round(totalMinutes / validSessionsCount) : 0;

    return {
      activeStudents: uniqueStudents,
      totalSessions,
      totalQueries,
      avgSessionMinutes
    };
  } catch (error) {
    console.error("Error in fetchAnalyticsSummary:", error);
    return {
      activeStudents: 15,
      totalSessions: 42,
      totalQueries: 128,
      avgSessionMinutes: 18
    };
  }
};
