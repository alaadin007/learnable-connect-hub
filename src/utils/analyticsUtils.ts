
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsData, AnalyticsFilters, SessionData, StudyTimeData, TopicData } from "@/components/analytics/types";

// Fetch teacher analytics data based on filters
export async function fetchTeacherAnalytics(filters: AnalyticsFilters): Promise<any> {
  try {
    const { dateRange, studentId, schoolId } = filters;
    
    // Prepare query parameters
    const queryParams = new URLSearchParams();
    if (schoolId) queryParams.append('school_id', schoolId);
    if (studentId) queryParams.append('student_id', studentId);
    if (dateRange.from) queryParams.append('from_date', dateRange.from.toISOString());
    if (dateRange.to) queryParams.append('to_date', dateRange.to.toISOString());
    
    // Fetch data from API
    const response = await fetch(`/api/analytics/teacher?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch analytics data');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in fetchTeacherAnalytics:", error);
    throw error;
  }
}

// Alternative implementation using Supabase directly
export async function fetchTeacherAnalyticsFromDB(filters: AnalyticsFilters): Promise<any> {
  try {
    const { dateRange, studentId, schoolId } = filters;
    
    // Fetch summary data
    const summaryQuery = supabase
      .from('school_analytics_summary')
      .select('*')
      .eq('school_id', schoolId)
      .single();
    
    // Fetch session data with filter
    let sessionsQuery = supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        school_id,
        topic_or_content_used,
        session_start,
        session_end,
        num_queries,
        profiles:profiles(full_name)
      `)
      .eq('school_id', schoolId)
      .order('session_start', { ascending: false })
      .limit(100);
    
    if (studentId) {
      sessionsQuery = sessionsQuery.eq('user_id', studentId);
    }
    
    if (dateRange.from) {
      sessionsQuery = sessionsQuery.gte('session_start', dateRange.from.toISOString());
    }
    
    if (dateRange.to) {
      sessionsQuery = sessionsQuery.lte('session_start', dateRange.to.toISOString());
    }
    
    // Fetch most studied topics
    let topicsQuery = supabase
      .from('most_studied_topics')
      .select('*')
      .eq('school_id', schoolId)
      .order('count_of_sessions', { ascending: false });
    
    // Fetch weekly study time
    let studyTimeQuery = supabase
      .from('student_weekly_study_time')
      .select('*')
      .eq('school_id', schoolId);
      
    if (studentId) {
      studyTimeQuery = studyTimeQuery.eq('user_id', studentId);
    }
    
    studyTimeQuery = studyTimeQuery.order('year', { ascending: true })
      .order('week_number', { ascending: true });
    
    // Execute all queries concurrently
    const [summaryResult, sessionsResult, topicsResult, studyTimeResult] = await Promise.all([
      summaryQuery,
      sessionsQuery,
      topicsQuery,
      studyTimeQuery
    ]);
    
    // Return compiled data
    return {
      summary: summaryResult.data || { active_students: 0, total_sessions: 0, total_queries: 0, avg_session_minutes: 0 },
      sessions: sessionsResult.data || [],
      topics: topicsResult.data || [],
      studyTime: studyTimeResult.data || []
    };
  } catch (error) {
    console.error("Error in fetchTeacherAnalyticsFromDB:", error);
    throw error;
  }
}

// Transform API data to match component expected format
export function adaptTeacherAnalyticsData(data: any): AnalyticsData {
  // Adapt summary data
  const summary = {
    activeStudents: data.summary?.active_students || 0,
    totalSessions: data.summary?.total_sessions || 0,
    totalQueries: data.summary?.total_queries || 0,
    avgSessionMinutes: data.summary?.avg_session_minutes || 0
  };
  
  // Adapt session data
  const sessions = (data.sessions || []).map((session: any) => ({
    id: session.session_id || session.id || '',
    userId: session.user_id || '',
    userName: session.student_name || session.profiles?.full_name || '',
    startTime: session.session_start || '',
    endTime: session.session_end || null,
    duration: (session.duration_minutes || 0) * 60,
    topicOrContent: session.topic_or_content_used || '',
    numQueries: session.num_queries || 0,
    // Additional fields from API
    student_name: session.student_name || session.profiles?.full_name || '',
    topic: session.topic || session.topic_or_content_used || '',
    topics: Array.isArray(session.topics) ? session.topics : [session.topic_or_content_used].filter(Boolean),
    questions_asked: session.questions_asked || session.num_queries || 0,
    questions_answered: session.questions_answered || 0,
    duration_minutes: session.duration_minutes || 0
  }));
  
  // Adapt topics data
  const topics = (data.topics || []).map((topic: any) => ({
    topic: topic.topic_or_content_used || '',
    count: topic.count_of_sessions || 0,
    // Additional fields from API
    topic_rank: topic.topic_rank || 0,
    name: topic.topic_or_content_used || '',
    value: topic.count_of_sessions || 0
  }));
  
  // Adapt study time data
  const studyTime = (data.studyTime || []).map((item: any) => ({
    week: item.week_number || 0,
    hours: item.study_hours || 0,
    // Additional fields from API
    week_number: item.week_number || 0,
    study_hours: item.study_hours || 0,
    year: item.year || new Date().getFullYear(),
    user_id: item.user_id || '',
    student_name: item.student_name || '',
    studentName: item.student_name || ''
  }));
  
  return {
    summary,
    sessions,
    topics,
    studyTime
  };
}
