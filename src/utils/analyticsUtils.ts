
// Import necessary functions
import { format } from 'date-fns';
import { getMockAnalyticsData } from './sessionLogging';
import { 
  AnalyticsFilters, 
  AnalyticsSummary,
  SessionData,
  TopicData,
  StudyTimeData
} from '@/components/analytics/types';
import { supabase } from '@/integrations/supabase/client';

// Fetch analytics summary data
export const fetchAnalyticsSummary = async (schoolId: string, filters: AnalyticsFilters): Promise<AnalyticsSummary> => {
  console.info("Fetching real analytics summary data for school:", schoolId);
  
  try {
    // Check if this is a test ID
    if (schoolId.startsWith('test-')) {
      // Return mock data for test accounts
      const mock = getMockAnalyticsData(schoolId);
      return mock.summary;
    }
    
    // For real accounts, fetch from supabase
    const { data, error } = await supabase.rpc('get_analytics_summary', {
      school_id: schoolId,
      start_date: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
      end_date: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
      teacher_id: filters.teacherId || undefined,
      student_id: filters.studentId || undefined
    });
    
    if (error) {
      console.error("Error fetching analytics summary:", error);
      throw error;
    }
    
    return data || {
      activeStudents: 0,
      totalSessions: 0,
      totalQueries: 0,
      avgSessionMinutes: 0
    };
  } catch (error) {
    console.error("Error in fetchAnalyticsSummary:", error);
    // Return default values on error
    return {
      activeStudents: 0,
      totalSessions: 0,
      totalQueries: 0,
      avgSessionMinutes: 0
    };
  }
};

// Fetch session logs
export const fetchSessionLogs = async (schoolId: string, filters: AnalyticsFilters): Promise<SessionData[]> => {
  console.info("Fetching real session logs for school:", schoolId);
  
  try {
    // Check if this is a test ID
    if (schoolId.startsWith('test-')) {
      // Return mock data for test accounts
      const mock = getMockAnalyticsData(schoolId);
      return mock.sessions;
    }
    
    // For real accounts, fetch from supabase
    const { data, error } = await supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        profiles!session_logs_user_id_fkey (
          full_name
        ),
        session_start,
        session_end,
        topic_or_content_used,
        num_queries
      `)
      .eq('school_id', schoolId)
      .order('session_start', { ascending: false });
      
    if (error) {
      console.error("Error fetching session logs:", error);
      throw error;
    }
    
    // Transform data to expected format
    return data.map(session => ({
      id: session.id,
      student_id: session.user_id,
      student_name: session.profiles?.full_name || 'Unknown Student',
      session_date: session.session_start,
      duration_minutes: session.session_end 
        ? Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000)
        : 0,
      topics: [session.topic_or_content_used || 'Unknown'],
      questions_asked: session.num_queries || 0,
      questions_answered: session.num_queries || 0,
      // Add compatibility fields for older code
      userId: session.user_id,
      userName: session.profiles?.full_name || 'Unknown Student',
      topic: session.topic_or_content_used || 'Unknown',
      queries: session.num_queries || 0
    })) || [];
  } catch (error) {
    console.error("Error in fetchSessionLogs:", error);
    // Return empty array on error
    return [];
  }
};

// Fetch topics
export const fetchTopics = async (schoolId: string, filters: AnalyticsFilters): Promise<TopicData[]> => {
  console.info("Fetching real topics for school:", schoolId);
  
  try {
    // Check if this is a test ID
    if (schoolId.startsWith('test-')) {
      // Return mock data for test accounts
      const mock = getMockAnalyticsData(schoolId);
      return mock.topics;
    }
    
    // For real accounts, fetch from supabase
    const { data, error } = await supabase.rpc('get_topic_counts', {
      school_id: schoolId,
      start_date: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
      end_date: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
      teacher_id: filters.teacherId || undefined,
      student_id: filters.studentId || undefined
    });
    
    if (error) {
      console.error("Error fetching topics:", error);
      throw error;
    }
    
    // Transform data to expected format
    return (data || []).map(topic => ({
      topic: topic.topic,
      count: topic.count,
      name: topic.topic,
      value: topic.count
    }));
  } catch (error) {
    console.error("Error in fetchTopics:", error);
    // Return empty array on error
    return [];
  }
};

// Fetch study time
export const fetchStudyTime = async (schoolId: string, filters: AnalyticsFilters): Promise<StudyTimeData[]> => {
  console.info("Fetching real study time for school:", schoolId);
  
  try {
    // Check if this is a test ID
    if (schoolId.startsWith('test-')) {
      // Return mock data for test accounts
      const mock = getMockAnalyticsData(schoolId);
      return mock.studyTime;
    }
    
    // For real accounts, fetch from supabase
    const { data, error } = await supabase.rpc('get_study_time_by_student', {
      school_id: schoolId,
      start_date: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
      end_date: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
      teacher_id: filters.teacherId || undefined,
      student_id: filters.studentId || undefined
    });
    
    if (error) {
      console.error("Error fetching study time:", error);
      throw error;
    }
    
    // Transform data to expected format
    return (data || []).map(item => ({
      student_id: item.student_id,
      student_name: item.student_name,
      total_minutes: item.total_minutes,
      // Add compatibility fields for older code
      name: item.student_name,
      studentName: item.student_name,
      hours: Math.round(item.total_minutes / 60 * 10) / 10, // Convert minutes to hours with 1 decimal
      week: 1,
      year: new Date().getFullYear()
    }));
  } catch (error) {
    console.error("Error in fetchStudyTime:", error);
    // Return empty array on error
    return [];
  }
};

// Get formatted date range text
export const getDateRangeText = (dateRange: DateRange | undefined): string => {
  if (!dateRange || !dateRange.from) {
    return "All Time";
  }
  
  const fromDate = format(dateRange.from, 'MMM dd, yyyy');
  const toDate = dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy');
  
  return `${fromDate} - ${toDate}`;
};

// Export analytics to CSV
export const exportAnalyticsToCSV = (
  summary: AnalyticsSummary,
  sessions: SessionData[],
  topics: TopicData[],
  studyTime: StudyTimeData[],
  dateRangeText: string
): void => {
  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Add header
  csvContent += `Analytics Export (${dateRangeText})\n\n`;
  
  // Add summary
  csvContent += "SUMMARY\n";
  csvContent += `Active Students,${summary.activeStudents}\n`;
  csvContent += `Total Sessions,${summary.totalSessions}\n`;
  csvContent += `Total Queries,${summary.totalQueries}\n`;
  csvContent += `Avg. Session Minutes,${summary.avgSessionMinutes}\n\n`;
  
  // Add sessions
  csvContent += "SESSIONS\n";
  csvContent += "Student,Date,Duration (min),Topic,Queries\n";
  
  sessions.forEach(session => {
    const row = [
      session.student_name,
      format(new Date(session.session_date), 'yyyy-MM-dd'),
      session.duration_minutes,
      session.topics.join("; "),
      session.questions_asked
    ].join(',');
    csvContent += row + "\n";
  });
  
  csvContent += "\nTOPICS\n";
  csvContent += "Topic,Count\n";
  
  topics.forEach(topic => {
    csvContent += `${topic.topic},${topic.count}\n`;
  });
  
  csvContent += "\nSTUDY TIME\n";
  csvContent += "Student,Total Minutes,Hours\n";
  
  studyTime.forEach(student => {
    csvContent += `${student.student_name},${student.total_minutes},${student.hours}\n`;
  });
  
  // Create and click download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
