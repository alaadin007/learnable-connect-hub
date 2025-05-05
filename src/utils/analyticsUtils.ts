// Import necessary functions
import { format } from 'date-fns';
import { getMockAnalyticsData } from './sessionLogging';
import { 
  AnalyticsFilters, 
  AnalyticsSummary,
  SessionData,
  TopicData,
  StudyTimeData,
  SchoolPerformanceSummary,
  SchoolPerformanceData,
  TeacherPerformanceData,
  StudentPerformanceData,
  DateRange
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
    // Note: Using PostgreSQL function directly as RPC might not be available
    const { data, error } = await supabase
      .from('school_analytics_summary')
      .select('*')
      .eq('school_id', schoolId)
      .single();
    
    if (error) {
      console.error("Error fetching analytics summary:", error);
      throw error;
    }
    
    return data ? {
      activeStudents: data.active_students || 0,
      totalSessions: data.total_sessions || 0,
      totalQueries: data.total_queries || 0,
      avgSessionMinutes: data.avg_session_minutes || 0
    } : {
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
      // Return mock data for test accounts with proper type mapping
      const mock = getMockAnalyticsData(schoolId);
      // Transform the mock sessions to match SessionData type
      return mock.sessions.map(session => ({
        id: session.id,
        student_id: session.userId,
        student_name: session.userName,
        session_date: session.startTime,
        duration_minutes: typeof session.duration === 'number' ? session.duration : parseInt(session.duration as string) || 0,
        topics: [session.topicOrContent],
        questions_asked: session.numQueries,
        questions_answered: session.queries,
        // Keep compatibility fields
        userId: session.userId,
        userName: session.userName,
        topic: session.topicOrContent,
        queries: session.queries,
        topicOrContent: session.topicOrContent,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        numQueries: session.numQueries
      }));
    }
    
    // For real accounts, fetch from supabase
    const { data, error } = await supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        profiles:user_id (
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
    if (!data) return [];
    
    return data.map(session => {
      // Handle potential undefined profiles
      const profileData = session.profiles as { full_name?: string } | null;
      const studentName = profileData?.full_name || 'Unknown Student';
      
      return {
        id: session.id,
        student_id: session.user_id,
        student_name: studentName,
        session_date: session.session_start,
        duration_minutes: session.session_end 
          ? Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000)
          : 0,
        topics: [session.topic_or_content_used || 'Unknown'],
        questions_asked: session.num_queries || 0,
        questions_answered: session.num_queries || 0,
        // Add compatibility fields for older code
        userId: session.user_id,
        userName: studentName,
        topic: session.topic_or_content_used || 'Unknown',
        queries: session.num_queries || 0
      };
    });
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
    const { data, error } = await supabase
      .from('most_studied_topics')
      .select('*')
      .eq('school_id', schoolId)
      .order('count_of_sessions', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error("Error fetching topics:", error);
      throw error;
    }
    
    // Transform data to expected format
    if (!data) return [];
    
    return data.map(topic => ({
      topic: topic.topic_or_content_used || 'Unknown',
      count: topic.count_of_sessions || 0,
      name: topic.topic_or_content_used || 'Unknown',
      value: topic.count_of_sessions || 0
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
      // Return mock data for test accounts with proper type mapping
      const mock = getMockAnalyticsData(schoolId);
      // Transform the mock study time to match StudyTimeData type
      return mock.studyTime.map(item => ({
        student_id: `student-${item.studentName.split(' ')[1]}`,
        student_name: item.studentName,
        total_minutes: item.hours * 60,
        // Keep compatibility fields
        studentName: item.studentName,
        name: item.name,
        hours: item.hours,
        week: item.week,
        year: item.year
      }));
    }
    
    // For real accounts, fetch from supabase
    const { data, error } = await supabase
      .from('student_weekly_study_time')
      .select('*')
      .eq('school_id', schoolId);
    
    if (error) {
      console.error("Error fetching study time:", error);
      throw error;
    }
    
    // Transform data to expected format
    if (!data) return [];
    
    return data.map(item => ({
      student_id: item.user_id || '',
      student_name: item.student_name || 'Unknown',
      total_minutes: item.study_hours ? item.study_hours * 60 : 0,
      // Add compatibility fields for older code
      name: item.student_name || 'Unknown',
      studentName: item.student_name || 'Unknown',
      hours: item.study_hours || 0,
      week: item.week_number ? Number(item.week_number) : 1,
      year: item.year ? Number(item.year) : new Date().getFullYear()
    }));
  } catch (error) {
    console.error("Error in fetchStudyTime:", error);
    // Return empty array on error
    return [];
  }
};

// NEW FUNCTION: Fetch school performance
export const fetchSchoolPerformance = async (schoolId: string, filters: AnalyticsFilters): Promise<{monthlyData: SchoolPerformanceData[], summary: SchoolPerformanceSummary}> => {
  console.info("Fetching school performance data for school:", schoolId);
  
  try {
    // Check if this is a test ID
    if (schoolId.startsWith('test-')) {
      // Return mock data for test accounts
      return {
        monthlyData: [
          { month: '2023-01-01', avg_monthly_score: 78, monthly_completion_rate: 65, score_improvement_rate: 0, completion_improvement_rate: 0 },
          { month: '2023-02-01', avg_monthly_score: 82, monthly_completion_rate: 70, score_improvement_rate: 5.1, completion_improvement_rate: 7.7 },
          { month: '2023-03-01', avg_monthly_score: 85, monthly_completion_rate: 75, score_improvement_rate: 3.7, completion_improvement_rate: 7.1 }
        ],
        summary: {
          total_assessments: 24,
          students_with_submissions: 18, 
          total_students: 25,
          avg_submissions_per_assessment: 3.5,
          avg_score: 82,
          completion_rate: 85,
          student_participation_rate: 72,
          improvement_rate: 5.2
        }
      };
    }
    
    // For real accounts, fetch from supabase
    // Get monthly data from improvement metrics
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('school_improvement_metrics')
      .select('*')
      .eq('school_id', schoolId)
      .order('month', { ascending: true });
    
    // Get summary data from performance metrics
    const { data: summaryData, error: summaryError } = await supabase
      .from('school_performance_metrics')
      .select('*')
      .eq('school_id', schoolId)
      .single();
    
    if (monthlyError) console.error("Error fetching monthly performance:", monthlyError);
    if (summaryError) console.error("Error fetching performance summary:", summaryError);
    
    return {
      monthlyData: monthlyData || [],
      summary: summaryData || {
        total_assessments: 0,
        students_with_submissions: 0,
        total_students: 0,
        avg_submissions_per_assessment: 0,
        avg_score: 0,
        completion_rate: 0,
        student_participation_rate: 0
      }
    };
  } catch (error) {
    console.error("Error in fetchSchoolPerformance:", error);
    // Return empty data on error
    return {
      monthlyData: [],
      summary: {
        total_assessments: 0,
        students_with_submissions: 0,
        total_students: 0,
        avg_submissions_per_assessment: 0,
        avg_score: 0,
        completion_rate: 0,
        student_participation_rate: 0
      }
    };
  }
};

// NEW FUNCTION: Fetch teacher performance
export const fetchTeacherPerformance = async (schoolId: string, filters: AnalyticsFilters): Promise<TeacherPerformanceData[]> => {
  console.info("Fetching teacher performance data for school:", schoolId);
  
  try {
    // Check if this is a test ID
    if (schoolId.startsWith('test-')) {
      // Return mock data for test accounts
      return [
        { 
          teacher_id: '1', 
          teacher_name: 'Teacher 1', 
          assessments_created: 10, 
          students_assessed: 18, 
          avg_submissions_per_assessment: 4.2, 
          avg_student_score: 82, 
          completion_rate: 85,
          id: '1',
          name: 'Teacher 1',
          students_count: 18
        },
        { 
          teacher_id: '2', 
          teacher_name: 'Teacher 2', 
          assessments_created: 8, 
          students_assessed: 15, 
          avg_submissions_per_assessment: 3.5, 
          avg_student_score: 78, 
          completion_rate: 72,
          id: '2',
          name: 'Teacher 2',
          students_count: 15
        }
      ];
    }
    
    // For real accounts, fetch from supabase
    const { data, error } = await supabase
      .from('teacher_performance_metrics')
      .select('*')
      .eq('school_id', schoolId);
    
    if (error) {
      console.error("Error fetching teacher performance:", error);
      throw error;
    }
    
    // Transform data to expected format
    if (!data) return [];
    
    return data.map(teacher => ({
      teacher_id: teacher.teacher_id || '',
      teacher_name: teacher.teacher_name || 'Unknown',
      assessments_created: teacher.assessments_created || 0,
      students_assessed: teacher.students_assessed || 0,
      avg_submissions_per_assessment: teacher.avg_submissions_per_assessment || 0,
      avg_student_score: teacher.avg_student_score || 0,
      completion_rate: teacher.completion_rate || 0,
      // Compatibility fields
      id: teacher.teacher_id || '',
      name: teacher.teacher_name || 'Unknown',
      students_count: teacher.students_assessed || 0
    }));
  } catch (error) {
    console.error("Error in fetchTeacherPerformance:", error);
    // Return empty array on error
    return [];
  }
};

// NEW FUNCTION: Fetch student performance
export const fetchStudentPerformance = async (schoolId: string, filters: AnalyticsFilters): Promise<StudentPerformanceData[]> => {
  console.info("Fetching student performance data for school:", schoolId);
  
  try {
    // Check if this is a test ID
    if (schoolId.startsWith('test-')) {
      // Return mock data for test accounts
      return [
        { 
          student_id: '1', 
          student_name: 'Student 1', 
          assessments_taken: 8, 
          avg_score: 85, 
          avg_time_spent_seconds: 1200, 
          assessments_completed: 7, 
          completion_rate: 87.5,
          top_strengths: 'Math, Science',
          top_weaknesses: 'History',
          id: '1',
          name: 'Student 1',
          teacher_name: 'Teacher 1'
        },
        { 
          student_id: '2', 
          student_name: 'Student 2', 
          assessments_taken: 7, 
          avg_score: 79, 
          avg_time_spent_seconds: 1350, 
          assessments_completed: 6, 
          completion_rate: 85.7,
          top_strengths: 'English, History',
          top_weaknesses: 'Math',
          id: '2',
          name: 'Student 2',
          teacher_name: 'Teacher 1'
        }
      ];
    }
    
    // For real accounts, fetch from supabase
    const { data, error } = await supabase
      .from('student_performance_metrics')
      .select('*')
      .eq('school_id', schoolId);
    
    if (error) {
      console.error("Error fetching student performance:", error);
      throw error;
    }
    
    // Transform data to expected format
    if (!data) return [];
    
    return data.map(student => ({
      student_id: student.student_id || '',
      student_name: student.student_name || 'Unknown',
      assessments_taken: student.assessments_taken || 0,
      avg_score: student.avg_score || 0,
      avg_time_spent_seconds: student.avg_time_spent_seconds || 0,
      assessments_completed: student.assessments_completed || 0,
      completion_rate: student.completion_rate || 0,
      top_strengths: student.top_strengths || '',
      top_weaknesses: student.top_weaknesses || '',
      // Compatibility fields
      id: student.student_id || '',
      name: student.student_name || 'Unknown',
      teacher_name: '' // We don't have this info in the source data
    }));
  } catch (error) {
    console.error("Error in fetchStudentPerformance:", error);
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
    csvContent += `${student.student_name},${student.total_minutes},${student.total_minutes / 60}\n`;
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
