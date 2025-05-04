
import { addDays, format, isValid, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import { AnalyticsFilters, AnalyticsSummary, SessionData, StudyTimeData, TopicData } from "@/components/analytics/types";
import { supabase } from "@/integrations/supabase/client";

// Utility to format date range into human-readable text
export const getDateRangeText = (dateRange?: DateRange): string => {
  if (!dateRange?.from) return "";
  
  const fromDate = typeof dateRange.from === 'string' 
    ? parseISO(dateRange.from) 
    : dateRange.from;
    
  if (!isValid(fromDate)) return "";

  if (!dateRange.to) {
    return `Since ${format(fromDate, "MMM d, yyyy")}`;
  }
  
  const toDate = typeof dateRange.to === 'string'
    ? parseISO(dateRange.to)
    : dateRange.to;
    
  if (!isValid(toDate)) return `Since ${format(fromDate, "MMM d, yyyy")}`;
  
  return `${format(fromDate, "MMM d")} - ${format(toDate, "MMM d, yyyy")}`;
};

// Fetch analytics summary data
export const fetchAnalyticsSummary = async (
  schoolId: string, 
  filters: AnalyticsFilters
): Promise<AnalyticsSummary> => {
  try {
    // Build query based on filters
    const { data: summary, error } = await supabase
      .from('school_analytics_summary')
      .select('active_students, total_sessions, total_queries, avg_session_minutes')
      .eq('school_id', schoolId)
      .single();

    if (error) throw error;

    return {
      activeStudents: summary?.active_students || 0,
      totalSessions: summary?.total_sessions || 0,
      totalQueries: summary?.total_queries || 0,
      avgSessionMinutes: summary?.avg_session_minutes || 0
    };
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    // Return default data on error
    return {
      activeStudents: 0,
      totalSessions: 0,
      totalQueries: 0,
      avgSessionMinutes: 0
    };
  }
};

// Fetch session logs
export const fetchSessionLogs = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<SessionData[]> => {
  try {
    // Start building the query
    let query = supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        topic_or_content_used,
        session_start,
        session_end,
        num_queries
      `)
      .eq('school_id', schoolId)
      .order('session_start', { ascending: false });
    
    // Apply date filter if provided
    if (filters.dateRange?.from) {
      const fromDate = typeof filters.dateRange.from === 'string'
        ? filters.dateRange.from
        : filters.dateRange.from.toISOString();
      
      query = query.gte('session_start', fromDate);
    }
    
    if (filters.dateRange?.to) {
      const toDate = typeof filters.dateRange.to === 'string'
        ? filters.dateRange.to
        : addDays(filters.dateRange.to, 1).toISOString(); // Include the entire end day
      
      query = query.lte('session_start', toDate);
    }
    
    // Apply student filter if provided
    if (filters.studentId) {
      query = query.eq('user_id', filters.studentId);
    }
    
    // Execute the query
    const { data, error } = await query.limit(100);
    
    if (error) throw error;
    
    // Get user profiles for mapping names
    const userIds = [...new Set((data || []).map(session => session.user_id))];
    let profiles: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      if (!profilesError && profilesData) {
        profiles = profilesData.reduce((acc: Record<string, string>, profile) => {
          acc[profile.id] = profile.full_name || 'Unknown';
          return acc;
        }, {});
      }
    }
    
    // Format the data for the frontend
    return (data || []).map(session => {
      // Calculate duration in minutes
      const start = new Date(session.session_start);
      const end = session.session_end ? new Date(session.session_end) : new Date();
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      
      // Extract topics as an array
      const topics = session.topic_or_content_used 
        ? [session.topic_or_content_used]
        : [];
      
      return {
        id: session.id,
        student_id: session.user_id,
        student_name: profiles[session.user_id] || 'Unknown',
        session_date: session.session_start,
        duration_minutes: durationMinutes,
        topics,
        topic: session.topic_or_content_used,
        questions_asked: session.num_queries,
        queries: session.num_queries
      };
    });
  } catch (error) {
    console.error('Error fetching session logs:', error);
    return [];
  }
};

// Fetch popular topics
export const fetchTopics = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<TopicData[]> => {
  try {
    // Fetch the top topics
    const { data, error } = await supabase
      .from('most_studied_topics')
      .select('topic_or_content_used, count_of_sessions')
      .eq('school_id', schoolId)
      .order('count_of_sessions', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    return (data || [])
      .filter(topic => topic.topic_or_content_used) // Filter out null topics
      .map(topic => ({
        topic: topic.topic_or_content_used || '',
        name: topic.topic_or_content_used || '',
        count: topic.count_of_sessions || 0,
        value: topic.count_of_sessions || 0
      }));
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
};

// Fetch student study time
export const fetchStudyTime = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<StudyTimeData[]> => {
  try {
    // Fetch study time by student
    const { data, error } = await supabase
      .from('student_weekly_study_time')
      .select('user_id, student_name, study_hours')
      .eq('school_id', schoolId)
      .order('study_hours', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      student_id: item.user_id,
      student_name: item.student_name || '',
      total_minutes: Math.round((item.study_hours || 0) * 60),
      name: item.student_name || '',
      studentName: item.student_name || '',
      hours: item.study_hours || 0
    }));
  } catch (error) {
    console.error('Error fetching study time:', error);
    return [];
  }
};

// Fetch school performance data
export const fetchSchoolPerformance = async (
  schoolId: string, 
  filters: AnalyticsFilters
) => {
  try {
    // This would typically be fetched from a database view or stored procedure
    // For now, we'll return mock data
    return {
      monthlyData: [
        { month: 'Jan', score: 78 },
        { month: 'Feb', score: 82 },
        { month: 'Mar', score: 85 },
        { month: 'Apr', score: 83 },
        { month: 'May', score: 87 }
      ],
      summary: {
        averageScore: 83,
        trend: 'up',
        changePercentage: 5,
      }
    };
  } catch (error) {
    console.error('Error fetching school performance:', error);
    return null;
  }
};

// Fetch teacher performance data
export const fetchTeacherPerformance = async (
  schoolId: string, 
  filters: AnalyticsFilters
) => {
  try {
    // This would be fetched from the database
    return [
      { id: 1, name: 'Teacher 1', students: 12, avgScore: 84, trend: 'up' },
      { id: 2, name: 'Teacher 2', students: 15, avgScore: 79, trend: 'down' },
      { id: 3, name: 'Teacher 3', students: 10, avgScore: 82, trend: 'steady' }
    ];
  } catch (error) {
    console.error('Error fetching teacher performance:', error);
    return [];
  }
};

// Fetch student performance data
export const fetchStudentPerformance = async (
  schoolId: string, 
  filters: AnalyticsFilters
) => {
  try {
    // This would be fetched from the database
    return [
      { id: 1, name: 'Student 1', teacher: 'Teacher 1', avgScore: 88, trend: 'up', subjects: ['Math', 'Science'] },
      { id: 2, name: 'Student 2', teacher: 'Teacher 2', avgScore: 76, trend: 'down', subjects: ['History', 'English'] },
      { id: 3, name: 'Student 3', teacher: 'Teacher 3', avgScore: 92, trend: 'up', subjects: ['Math', 'Physics'] }
    ];
  } catch (error) {
    console.error('Error fetching student performance:', error);
    return [];
  }
};

// Export analytics data to CSV
export const exportAnalyticsToCSV = (
  summary: AnalyticsSummary,
  sessions: SessionData[],
  topics: TopicData[],
  studyTimes: StudyTimeData[],
  dateRangeText: string
) => {
  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Add summary section
  csvContent += "SUMMARY DATA\r\n";
  csvContent += `Date Range,${dateRangeText}\r\n`;
  csvContent += `Active Students,${summary.activeStudents}\r\n`;
  csvContent += `Total Sessions,${summary.totalSessions}\r\n`;
  csvContent += `Total Queries,${summary.totalQueries}\r\n`;
  csvContent += `Average Session Duration (minutes),${summary.avgSessionMinutes}\r\n\r\n`;
  
  // Add sessions section
  csvContent += "SESSION DATA\r\n";
  csvContent += "Student,Date,Topic,Duration (min),Queries\r\n";
  
  sessions.forEach(session => {
    const row = [
      session.student_name || session.userName || "Unknown",
      session.session_date.split("T")[0],
      session.topic || (session.topics ? session.topics.join("; ") : ""),
      session.duration_minutes,
      session.questions_asked || session.queries || 0
    ];
    csvContent += row.join(",") + "\r\n";
  });
  
  csvContent += "\r\nTOPIC DATA\r\n";
  csvContent += "Topic,Count\r\n";
  
  topics.forEach(topic => {
    csvContent += `${topic.topic},${topic.count}\r\n`;
  });
  
  csvContent += "\r\nSTUDY TIME DATA\r\n";
  csvContent += "Student,Total Minutes,Hours\r\n";
  
  studyTimes.forEach(studyTime => {
    csvContent += `${studyTime.student_name},${studyTime.total_minutes},${(studyTime.total_minutes / 60).toFixed(1)}\r\n`;
  });
  
  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `analytics_export_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  
  // Download file
  link.click();
  
  // Clean up
  document.body.removeChild(link);
};
