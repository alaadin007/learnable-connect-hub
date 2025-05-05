
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { AnalyticsFilters, AnalyticsSummary, SessionData, TopicData, StudyTimeData } from '@/components/analytics/types';
import { DateRange } from 'react-day-picker';

export const getDateRangeText = (dateRange?: DateRange): string => {
  if (!dateRange?.from) return 'All time';
  
  const from = format(dateRange.from, 'MMM d, yyyy');
  const to = dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'now';
  
  return `${from} to ${to}`;
};

export const fetchAnalyticsSummary = async (schoolId: string | null, filters: AnalyticsFilters): Promise<AnalyticsSummary | null> => {
  try {
    if (!schoolId) {
      console.warn("School ID not provided for fetchAnalyticsSummary");
      return null;
    }

    // Format date range for the query
    const fromDate = filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : null;
    const toDate = filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : null;
    
    // Query the analytics summary view
    const { data, error } = await supabase
      .from('school_analytics_summary')
      .select('*')
      .eq('school_id', schoolId)
      .single();
    
    if (error) {
      console.error("Error fetching analytics summary:", error);
      return null;
    }
    
    if (!data) {
      console.warn("No analytics summary found for school ID:", schoolId);
      return null;
    }
    
    return {
      activeStudents: data.active_students || 0,
      totalSessions: data.total_sessions || 0,
      totalQueries: data.total_queries || 0,
      avgSessionMinutes: data.avg_session_minutes || 0
    };
  } catch (error) {
    console.error("Error in fetchAnalyticsSummary:", error);
    return null;
  }
};

export const fetchSessionLogs = async (schoolId: string | null, filters: AnalyticsFilters): Promise<SessionData[]> => {
  try {
    if (!schoolId) {
      console.warn("School ID not provided for fetchSessionLogs");
      return [];
    }

    // Format date range for the query
    const fromDate = filters.dateRange?.from ? filters.dateRange.from.toISOString() : null;
    const toDate = filters.dateRange?.to ? filters.dateRange.to.toISOString() : null;
    
    // Update the query to use a separate profiles fetch instead of a direct join
    let query = supabase
      .from('session_logs')
      .select(`
        id,
        user_id,
        school_id,
        session_start,
        session_end,
        topic_or_content_used,
        num_queries
      `)
      .eq('school_id', schoolId)
      .order('session_start', { ascending: false })
      .limit(20);
    
    // Apply date filters if provided
    if (fromDate) {
      query = query.gte('session_start', fromDate);
    }
    
    if (toDate) {
      query = query.lte('session_start', toDate);
    }
    
    // Apply student filter if provided
    if (filters.studentId) {
      query = query.eq('user_id', filters.studentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching session logs:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn("No session logs found for the given filters");
      return [];
    }
    
    // Get user profiles in a separate query
    const userIds = data.map(session => session.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
      
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }
    
    // Create a lookup map for profiles
    const profilesMap = new Map();
    if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap.set(profile.id, profile.full_name);
      });
    }
    
    // Transform the data to match the SessionData interface
    return data.map(session => {
      // Calculate duration in minutes
      let durationMinutes = 0;
      if (session.session_start && session.session_end) {
        const start = new Date(session.session_start);
        const end = new Date(session.session_end);
        durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }
      
      // Get student name from the profiles map or use a default
      const studentName = profilesMap.get(session.user_id) || 'Unknown Student';
      
      // Parse topics as array or use single topic
      const topics = typeof session.topic_or_content_used === 'string'
        ? [session.topic_or_content_used]
        : session.topic_or_content_used || [];
        
      return {
        id: session.id,
        student_id: session.user_id,
        student_name: studentName,
        session_date: session.session_start,
        duration_minutes: durationMinutes,
        topics: topics,
        questions_asked: session.num_queries || 0,
        questions_answered: session.num_queries || 0, // Assuming all queries were answered
        userId: session.user_id,
        userName: studentName,
        topic: Array.isArray(topics) ? topics[0] : topics,
        queries: session.num_queries || 0
      };
    });
  } catch (error) {
    console.error("Error in fetchSessionLogs:", error);
    return [];
  }
};

export const fetchTopics = async (schoolId: string | null, filters: AnalyticsFilters): Promise<TopicData[]> => {
  try {
    if (!schoolId) {
      console.warn("School ID not provided for fetchTopics");
      return [];
    }
    
    // Query the most_studied_topics view
    const { data, error } = await supabase
      .from('most_studied_topics')
      .select('*')
      .eq('school_id', schoolId)
      .order('count_of_sessions', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error("Error fetching topics:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn("No topic data found for school ID:", schoolId);
      return [];
    }
    
    // Transform the data to match the TopicData interface
    return data.map(topic => ({
      topic: topic.topic_or_content_used || 'Unknown',
      count: topic.count_of_sessions || 0,
      name: topic.topic_or_content_used || 'Unknown',
      value: topic.count_of_sessions || 0
    }));
  } catch (error) {
    console.error("Error in fetchTopics:", error);
    return [];
  }
};

export const fetchStudyTime = async (schoolId: string | null, filters: AnalyticsFilters): Promise<StudyTimeData[]> => {
  try {
    if (!schoolId) {
      console.warn("School ID not provided for fetchStudyTime");
      return [];
    }
    
    // Query the student_weekly_study_time view
    const { data, error } = await supabase
      .from('student_weekly_study_time')
      .select('*')
      .eq('school_id', schoolId)
      .order('study_hours', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error("Error fetching study time:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn("No study time data found for school ID:", schoolId);
      return [];
    }
    
    // Transform the data to match the StudyTimeData interface
    return data.map(study => ({
      student_id: study.user_id || '',
      student_name: study.student_name || 'Unknown Student',
      total_minutes: Math.round((study.study_hours || 0) * 60),
      name: study.student_name || 'Unknown Student',
      studentName: study.student_name || 'Unknown Student',
      hours: study.study_hours || 0,
      week: study.week_number || 0,
      year: study.year || new Date().getFullYear()
    }));
  } catch (error) {
    console.error("Error in fetchStudyTime:", error);
    return [];
  }
};

export const fetchSchoolPerformance = async (schoolId: string | null, filters: AnalyticsFilters) => {
  try {
    if (!schoolId) {
      console.warn("School ID not provided for fetchSchoolPerformance");
      return null;
    }
    
    // Get performance summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('school_performance_metrics')
      .select('*')
      .eq('school_id', schoolId)
      .single();
    
    if (summaryError) {
      console.error("Error fetching school performance summary:", summaryError);
    }
    
    // Get monthly improvement metrics
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('school_improvement_metrics')
      .select('*')
      .eq('school_id', schoolId)
      .order('month', { ascending: true });
    
    if (monthlyError) {
      console.error("Error fetching school monthly performance:", monthlyError);
    }
    
    // Format the performance data
    const formattedMonthlyData = (monthlyData || []).map(month => ({
      month: format(new Date(month.month), 'MMM'),
      score: month.avg_monthly_score || 0,
      completionRate: month.monthly_completion_rate || 0,
      improvement: month.score_improvement_rate || 0
    }));
    
    const summary = summaryData ? {
      averageScore: summaryData.avg_score || 0,
      trend: ((summaryData.avg_score || 0) > 80) ? 'up' : 'down',
      changePercentage: 5, // This would need to be calculated
      completionRate: summaryData.completion_rate || 0,
      participationRate: summaryData.student_participation_rate || 0
    } : null;
    
    return {
      monthlyData: formattedMonthlyData,
      summary
    };
  } catch (error) {
    console.error("Error in fetchSchoolPerformance:", error);
    return null;
  }
};

export const fetchTeacherPerformance = async (schoolId: string | null, filters: AnalyticsFilters) => {
  try {
    if (!schoolId) {
      console.warn("School ID not provided for fetchTeacherPerformance");
      return [];
    }
    
    // Query the teacher_performance_metrics view
    const { data, error } = await supabase
      .from('teacher_performance_metrics')
      .select('*')
      .eq('school_id', schoolId)
      .order('avg_student_score', { ascending: false });
    
    if (error) {
      console.error("Error fetching teacher performance:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn("No teacher performance data found for school ID:", schoolId);
      return [];
    }
    
    // Transform the data to match expected format
    return data.map(teacher => ({
      id: teacher.teacher_id,
      name: teacher.teacher_name || 'Unknown Teacher',
      students: teacher.students_assessed || 0,
      avgScore: teacher.avg_student_score || 0,
      assessmentsCreated: teacher.assessments_created || 0,
      completionRate: teacher.completion_rate || 0,
      trend: ((teacher.avg_student_score || 0) > 80) ? 'up' : 'down'
    }));
  } catch (error) {
    console.error("Error in fetchTeacherPerformance:", error);
    return [];
  }
};

export const fetchStudentPerformance = async (schoolId: string | null, filters: AnalyticsFilters) => {
  try {
    if (!schoolId) {
      console.warn("School ID not provided for fetchStudentPerformance");
      return [];
    }
    
    // Query the student_performance_metrics view
    const { data, error } = await supabase
      .from('student_performance_metrics')
      .select('*')
      .eq('school_id', schoolId)
      .order('avg_score', { ascending: false });
    
    if (error) {
      console.error("Error fetching student performance:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn("No student performance data found for school ID:", schoolId);
      return [];
    }
    
    // Transform the data to match expected format
    return data.map(student => {
      // Parse strengths and weaknesses as arrays
      const strengths = student.top_strengths ? student.top_strengths.split(', ') : [];
      
      return {
        id: student.student_id,
        name: student.student_name || 'Unknown Student',
        teacher: 'Assigned Teacher', // This would need a join with teacher data
        avgScore: student.avg_score || 0,
        trend: ((student.avg_score || 0) > 80) ? 'up' : 'down',
        subjects: strengths,
        assessmentsTaken: student.assessments_taken || 0,
        completionRate: student.completion_rate || 0
      };
    });
  } catch (error) {
    console.error("Error in fetchStudentPerformance:", error);
    return [];
  }
};

// Helper to fetch students for dropdowns
export const fetchStudents = async (schoolId: string | null) => {
  try {
    if (!schoolId) {
      console.warn("School ID not provided for fetchStudents");
      return [];
    }
    
    // Modified query to avoid the join with profiles
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, school_id')
      .eq('school_id', schoolId);
    
    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return [];
    }
    
    if (!studentsData || studentsData.length === 0) {
      return [];
    }
    
    // Get profiles in a separate query
    const studentIds = studentsData.map(student => student.id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);
      
    if (profilesError) {
      console.error("Error fetching student profiles:", profilesError);
      return [];
    }
    
    // Create a map from profiles data
    const profilesMap = new Map();
    if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap.set(profile.id, profile.full_name);
      });
    }
    
    // Combine data from both queries
    return studentsData.map(student => ({
      id: student.id,
      name: profilesMap.get(student.id) || 'Unknown Student'
    }));
  } catch (error) {
    console.error("Error in fetchStudents:", error);
    return [];
  }
};

// Helper to fetch teachers for dropdowns
export const fetchTeachers = async (schoolId: string | null) => {
  try {
    if (!schoolId) {
      console.warn("School ID not provided for fetchTeachers");
      return [];
    }
    
    // Modified query to avoid the join with profiles
    const { data: teachersData, error: teachersError } = await supabase
      .from('teachers')
      .select('id, school_id')
      .eq('school_id', schoolId);
    
    if (teachersError) {
      console.error("Error fetching teachers:", teachersError);
      return [];
    }
    
    if (!teachersData || teachersData.length === 0) {
      return [];
    }
    
    // Get profiles in a separate query
    const teacherIds = teachersData.map(teacher => teacher.id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', teacherIds);
      
    if (profilesError) {
      console.error("Error fetching teacher profiles:", profilesError);
      return [];
    }
    
    // Create a map from profiles data
    const profilesMap = new Map();
    if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap.set(profile.id, profile.full_name);
      });
    }
    
    // Combine data from both queries
    return teachersData.map(teacher => ({
      id: teacher.id,
      name: profilesMap.get(teacher.id) || 'Unknown Teacher'
    }));
  } catch (error) {
    console.error("Error in fetchTeachers:", error);
    return [];
  }
};

export const exportAnalyticsToCSV = (
  summary: AnalyticsSummary | null, 
  sessions: SessionData[], 
  topics: TopicData[], 
  studyTime: StudyTimeData[],
  dateRangeText: string
) => {
  // Escape CSV cell content to handle commas, quotes, newlines.
  const csvEscape = (cell: string | number | null | undefined): string => {
    if (cell == null) return "";
    const cellStr = cell.toString();
    const escaped = cellStr.replace(/"/g, '""');
    if (/[",\n]/.test(cellStr)) {
      return `"${escaped}"`;
    }
    return escaped;
  };

  // Format date
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toISOString().slice(0, 10);
  };

  // Prepare summary data
  const summaryData = summary ? [
    ["Analytics Summary", ""],
    ["Date Range", dateRangeText],
    ["Active Students", summary.activeStudents.toString()],
    ["Total Sessions", summary.totalSessions.toString()],
    ["Total Queries", summary.totalQueries.toString()],
    ["Avg Session (minutes)", summary.avgSessionMinutes.toString()],
    ["", ""],
  ] : [];
  
  // Prepare topics data
  const topicsHeader = ["Topic", "Count"];
  const topicsData = topics.map(topic => [
    csvEscape(topic.topic ?? topic.name ?? "Unknown"),
    csvEscape(topic.count ?? topic.value ?? 0)
  ]);
  const topicsCSV = [
    ["Most Studied Topics", ""],
    topicsHeader,
    ...topicsData,
    ["", ""],
  ];
  
  // Prepare study time data
  const studyTimeHeader = ["Student", "Hours"];
  const studyTimeData = studyTime.map(item => [
    csvEscape(item.student_name ?? item.studentName ?? item.name ?? "Unknown"),
    csvEscape(
      typeof item.total_minutes === "number"
        ? (item.total_minutes / 60).toFixed(2)
        : item.hours?.toString() ?? "0"
    )
  ]);
  const studyTimeCSV = [
    ["Weekly Study Time", ""],
    studyTimeHeader,
    ...studyTimeData,
    ["", ""],
  ];
  
  // Prepare sessions data
  const sessionsHeader = ["Student", "Topic", "Queries", "Duration", "Date"];
  const sessionsData = sessions.map(session => [
    csvEscape(session.student_name ?? session.userName ?? "Unknown"),
    csvEscape(
      Array.isArray(session.topics) && session.topics.length > 0
        ? session.topics[0]
        : session.topic ?? "General"
    ),
    csvEscape(session.questions_asked ?? session.queries ?? 0),
    csvEscape(
      typeof session.duration_minutes === "number"
        ? `${session.duration_minutes} min`
        : `${session.duration_minutes ?? 0} min`
    ),
    csvEscape(formatDate(session.session_date))
  ]);
  const sessionsCSV = [
    ["Session Details", ""],
    sessionsHeader,
    ...sessionsData
  ];
  
  // Combine all data
  const csvContent = [
    ...summaryData,
    ...topicsCSV,
    ...studyTimeCSV,
    ...sessionsCSV
  ]
    .map(row => row.join(","))
    .join("\n");
  
  // Create and download the CSV file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `analytics-export-${dateRangeText.replace(/\s/g, "-")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
