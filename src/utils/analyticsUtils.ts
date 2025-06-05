import { supabase } from '@/integrations/supabase/client';
import { SessionData, TopicData, StudyTimeData, AnalyticsSummary, AnalyticsFilters, DateRange } from '@/components/analytics/types';

// Get analytics summary using the new security definer function
export const getAnalyticsSummary = async (schoolId: string): Promise<AnalyticsSummary> => {
  try {
    const { data, error } = await supabase.rpc('get_school_analytics_summary', {
      p_school_id: schoolId
    });

    if (error) {
      console.error('Error fetching analytics summary:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return {
        activeStudents: 0,
        totalSessions: 0,
        totalQueries: 0,
        avgSessionMinutes: 0
      };
    }

    const result = data[0];
    return {
      activeStudents: result.active_students || 0,
      totalSessions: result.total_sessions || 0,
      totalQueries: result.total_queries || 0,
      avgSessionMinutes: result.avg_session_minutes || 0
    };
  } catch (error) {
    console.error('Error in getAnalyticsSummary:', error);
    throw error;
  }
};

// Get session logs with filters
export const getSessionLogs = async (schoolId: string, filters?: AnalyticsFilters): Promise<SessionData[]> => {
  try {
    let query = supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        session_start,
        session_end,
        num_queries,
        topic_or_content_used,
        profiles!inner(full_name)
      `)
      .eq('school_id', schoolId)
      .order('session_start', { ascending: false });

    // Apply date filters if provided
    if (filters?.dateRange?.from) {
      query = query.gte('session_start', filters.dateRange.from.toISOString());
    }
    if (filters?.dateRange?.to) {
      query = query.lte('session_start', filters.dateRange.to.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching session logs:', error);
      throw error;
    }

    return (data || []).map(session => ({
      id: session.id,
      userId: session.user_id,
      userName: session.profiles?.full_name || 'Unknown User',
      sessionStart: new Date(session.session_start),
      sessionEnd: session.session_end ? new Date(session.session_end) : null,
      numQueries: session.num_queries || 0,
      topic: session.topic_or_content_used || 'N/A',
      duration: session.session_end ? 
        Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / (1000 * 60)) : 
        0
    }));
  } catch (error) {
    console.error('Error in getSessionLogs:', error);
    throw error;
  }
};

// Get most studied topics using the new security definer function
export const getTopics = async (schoolId: string, filters?: AnalyticsFilters): Promise<TopicData[]> => {
  try {
    const { data, error } = await supabase.rpc('get_most_studied_topics', {
      p_school_id: schoolId
    });

    if (error) {
      console.error('Error fetching topics:', error);
      throw error;
    }

    return (data || []).map(topic => ({
      topic: topic.topic_or_content_used || 'Unknown',
      count: topic.count_of_sessions || 0,
      rank: topic.topic_rank || 0
    }));
  } catch (error) {
    console.error('Error in getTopics:', error);
    throw error;
  }
};

// Get student study time using the new security definer function
export const getStudyTime = async (schoolId: string, filters?: AnalyticsFilters): Promise<StudyTimeData[]> => {
  try {
    const { data, error } = await supabase.rpc('get_student_weekly_study_time', {
      p_school_id: schoolId
    });

    if (error) {
      console.error('Error fetching study time:', error);
      throw error;
    }

    return (data || []).map(item => ({
      userId: item.user_id,
      studentName: item.student_name || 'Unknown Student',
      week: `${item.year}-W${item.week_number}`,
      hours: item.study_hours || 0
    }));
  } catch (error) {
    console.error('Error in getStudyTime:', error);
    throw error;
  }
};

// Helper function to format date range for display and export
export const getDateRangeText = (dateRange?: DateRange): string => {
  if (!dateRange || (!dateRange.from && !dateRange.to)) {
    return 'All Time';
  }
  
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (dateRange.from && dateRange.to) {
    return `${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`;
  } else if (dateRange.from) {
    return `From ${formatDate(dateRange.from)}`;
  } else if (dateRange.to) {
    return `Until ${formatDate(dateRange.to)}`;
  }
  
  return 'Custom Range';
};

// Export analytics data to CSV
export const exportAnalyticsToCSV = (
  summary: AnalyticsSummary,
  sessions: SessionData[],
  topics: TopicData[],
  studyTime: StudyTimeData[],
  dateRangeText: string
) => {
  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Add summary section
  csvContent += "ANALYTICS SUMMARY - " + dateRangeText + "\r\n";
  csvContent += "Active Students,Total Sessions,Total Queries,Avg Session Minutes\r\n";
  csvContent += `${summary.activeStudents},${summary.totalSessions},${summary.totalQueries},${summary.avgSessionMinutes.toFixed(2)}\r\n\r\n`;
  
  // Add sessions section
  csvContent += "SESSION LOGS\r\n";
  csvContent += "User,Start Time,End Time,Duration (min),Queries,Topic\r\n";
  
  sessions.forEach(session => {
    const startTime = session.sessionStart.toLocaleString();
    const endTime = session.sessionEnd ? session.sessionEnd.toLocaleString() : 'N/A';
    csvContent += `"${session.userName}","${startTime}","${endTime}",${session.duration},${session.numQueries},"${session.topic}"\r\n`;
  });
  
  csvContent += "\r\n";
  
  // Add topics section
  csvContent += "MOST STUDIED TOPICS\r\n";
  csvContent += "Rank,Topic,Count\r\n";
  
  topics.forEach(topic => {
    csvContent += `${topic.rank},"${topic.topic}",${topic.count}\r\n`;
  });
  
  csvContent += "\r\n";
  
  // Add study time section
  csvContent += "WEEKLY STUDY TIME\r\n";
  csvContent += "Student,Week,Hours\r\n";
  
  studyTime.forEach(item => {
    csvContent += `"${item.studentName}","${item.week}",${item.hours.toFixed(2)}\r\n`;
  });
  
  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  
  // Trigger download and clean up
  link.click();
  document.body.removeChild(link);
};
