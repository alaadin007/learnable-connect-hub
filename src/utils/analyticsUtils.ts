// Update the import section to include our UUID validation helper
import { supabase, getMockOrValidUUID } from "@/integrations/supabase/client";
import { 
  AnalyticsFilters, 
  SessionData, 
  TopicData, 
  StudyTimeData, 
  Student,
  Teacher
} from "@/components/analytics/types";
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

// Helper function to safely execute a Supabase query with UUID validation
const safeQuery = async (queryFn: () => Promise<any>, mockData: any = null) => {
  try {
    return await queryFn();
  } catch (error) {
    console.error('Error in Supabase query:', error);
    return mockData;
  }
};

// Date utility functions
export const formatDate = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

export const subDaysFormatted = (date: Date, days: number): string => {
  const newDate = subDays(date, days);
  return format(newDate, "yyyy-MM-dd");
};

export const isDateWithinRange = (date: Date, from: Date, to: Date): boolean => {
  const start = startOfDay(from);
  const end = endOfDay(to);
  const checkDate = date;

  return isAfter(checkDate, start) && isBefore(checkDate, end);
};

export const getDateRangeText = (dateRange: { from: Date; to: Date }): string => {
  const fromDate = format(dateRange.from, "MMM d, yyyy");
  const toDate = format(dateRange.to, "MMM d, yyyy");
  return `${fromDate} - ${toDate}`;
};

export const fetchAnalyticsSummary = async (
  schoolId?: string, 
  filters?: AnalyticsFilters
): Promise<{ 
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
} | null> => {
  try {
    // Validate schoolId to prevent UUID format errors
    const validSchoolId = getMockOrValidUUID(schoolId);
    
    if (!validSchoolId) {
      console.log("fetchAnalyticsSummary: Invalid or missing school ID, returning mock data");
      return generateMockSummary();
    }
    
    // Try to fetch real data
    const { data, error } = await supabase
      .from('school_analytics_summary')
      .select('*')
      .eq('school_id', validSchoolId)
      .single();
    
    if (error) {
      console.error("Error fetching analytics summary:", error);
      return generateMockSummary();
    }
    
    if (data) {
      return {
        activeStudents: data.active_students || 0,
        totalSessions: data.total_sessions || 0,
        totalQueries: data.total_queries || 0,
        avgSessionMinutes: data.avg_session_minutes || 0
      };
    }
    
    return generateMockSummary();
  } catch (error) {
    console.error("Error in fetchAnalyticsSummary:", error);
    return generateMockSummary();
  }
};

function generateMockSummary() {
  return {
    activeStudents: 15,
    totalSessions: 42,
    totalQueries: 128,
    avgSessionMinutes: 18,
  };
}

export const fetchSessionLogs = async (
  schoolId?: string, 
  filters?: AnalyticsFilters
): Promise<SessionData[]> => {
  try {
    // Validate schoolId to prevent UUID format errors
    const validSchoolId = getMockOrValidUUID(schoolId);
    
    if (!validSchoolId) {
      console.log("fetchSessionLogs: Invalid or missing school ID, returning mock data");
      return generateMockSessions(5);
    }
    
    // First, fetch the basic session logs
    const { data: sessionLogs, error: sessionError } = await safeQuery(() => 
      supabase
        .from('session_logs')
        .select('id, user_id, school_id, topic_or_content_used, session_start, session_end, num_queries')
        .eq('school_id', validSchoolId)
        .order('session_start', { ascending: false })
        .limit(20)
    );
    
    if (sessionError || !sessionLogs || sessionLogs.length === 0) {
      console.error("Error or no data in fetchSessionLogs:", sessionError);
      return generateMockSessions(5);
    }
    
    // We need to fetch user names separately since we were getting relation errors
    const userIds = [...new Set(sessionLogs.map(session => session.user_id))];
    const { data: profiles, error: profilesError } = await safeQuery(() => 
      supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)
    );
    
    // Create a lookup map for user names
    const userNameMap = new Map();
    if (profiles && profiles.length > 0) {
      profiles.forEach(profile => {
        userNameMap.set(profile.id, profile.full_name);
      });
    }
    
    // Map session logs to the SessionData format
    return sessionLogs.map(session => ({
      id: session.id,
      student_id: session.user_id,
      student_name: userNameMap.get(session.user_id) || "Unknown Student",
      session_date: session.session_start,
      duration_minutes: session.session_end 
        ? Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000) 
        : 0,
      topics: session.topic_or_content_used ? [session.topic_or_content_used] : [],
      questions_asked: session.num_queries || 0,
      questions_answered: session.num_queries || 0,
      userId: session.user_id,
      userName: userNameMap.get(session.user_id) || "Unknown Student",
      topic: session.topic_or_content_used || "General",
      queries: session.num_queries || 0,
    }));
  } catch (error) {
    console.error("Error in fetchSessionLogs:", error);
    return generateMockSessions(5);
  }
};

function generateMockSessions(count: number): SessionData[] {
  return Array(count).fill(null).map((_, i) => ({
    id: `mock-session-${i}`,
    student_id: `student-${i % 3 + 1}`,
    student_name: `Student ${i % 3 + 1}`,
    session_date: new Date(Date.now() - i * 86400000).toISOString(),
    duration_minutes: Math.floor(Math.random() * 45) + 10,
    topics: ['Math', 'Science', 'History', 'English', 'Geography'][i % 5].split(','),
    questions_asked: Math.floor(Math.random() * 10) + 3,
    questions_answered: Math.floor(Math.random() * 8) + 2,
    userId: `student-${i % 3 + 1}`,
    userName: `Student ${i % 3 + 1}`,
    topic: ['Math', 'Science', 'History', 'English', 'Geography'][i % 5],
    queries: Math.floor(Math.random() * 10) + 3,
  }));
}

export const fetchTopics = async (
  schoolId?: string, 
  filters?: AnalyticsFilters
): Promise<TopicData[]> => {
  try {
    // Validate schoolId to prevent UUID format errors
    const validSchoolId = getMockOrValidUUID(schoolId);
    
    if (!validSchoolId) {
      console.log("fetchTopics: Invalid or missing school ID, returning mock data");
      return generateMockTopics();
    }
    
    // Try to fetch real data
    const { data, error } = await safeQuery(() => 
      supabase
        .from('most_studied_topics')
        .select('*')
        .eq('school_id', validSchoolId)
        .order('count_of_sessions', { ascending: false })
        .limit(10)
    );
    
    if (error || !data || data.length === 0) {
      console.error("Error or no data in fetchTopics:", error);
      return generateMockTopics();
    }
    
    return data.map(topic => ({
      topic: topic.topic_or_content_used || 'Unknown',
      count: topic.count_of_sessions || 0,
      name: topic.topic_or_content_used || 'Unknown',
      value: topic.count_of_sessions || 0
    }));
  } catch (error) {
    console.error("Error in fetchTopics:", error);
    return generateMockTopics();
  }
};

function generateMockTopics(): TopicData[] {
  return [
    { topic: 'Math', count: 15, name: 'Math', value: 15 },
    { topic: 'Science', count: 12, name: 'Science', value: 12 },
    { topic: 'History', count: 8, name: 'History', value: 8 },
    { topic: 'English', count: 7, name: 'English', value: 7 },
    { topic: 'Geography', count: 5, name: 'Geography', value: 5 },
  ];
}

export const fetchStudyTime = async (
  schoolId?: string, 
  filters?: AnalyticsFilters
): Promise<StudyTimeData[]> => {
  try {
    // Validate schoolId to prevent UUID format errors
    const validSchoolId = getMockOrValidUUID(schoolId);
    
    if (!validSchoolId) {
      console.log("fetchStudyTime: Invalid or missing school ID, returning mock data");
      return generateMockStudyTime();
    }
    
    // Try to fetch real data
    const { data, error } = await safeQuery(() => 
      supabase
        .from('student_weekly_study_time')
        .select('*')
        .eq('school_id', validSchoolId)
        .order('study_hours', { ascending: false })
        .limit(10)
    );
    
    if (error || !data || data.length === 0) {
      console.error("Error or no data in fetchStudyTime:", error);
      return generateMockStudyTime();
    }
    
    return data.map(item => ({
      student_id: item.user_id || '',
      student_name: item.student_name || 'Unknown Student',
      total_minutes: (item.study_hours || 0) * 60,
      name: item.student_name || 'Unknown Student',
      studentName: item.student_name || 'Unknown Student',
      hours: item.study_hours || 0,
      week: item.week_number || 0,
      year: item.year || new Date().getFullYear()
    }));
  } catch (error) {
    console.error("Error in fetchStudyTime:", error);
    return generateMockStudyTime();
  }
};

function generateMockStudyTime(): StudyTimeData[] {
  return [
    { student_id: 'student-1', student_name: 'Student 1', total_minutes: 240, name: 'Student 1', studentName: 'Student 1', hours: 4, week: 1, year: 2023 },
    { student_id: 'student-2', student_name: 'Student 2', total_minutes: 180, name: 'Student 2', studentName: 'Student 2', hours: 3, week: 1, year: 2023 },
    { student_id: 'student-3', student_name: 'Student 3', total_minutes: 150, name: 'Student 3', studentName: 'Student 3', hours: 2.5, week: 1, year: 2023 },
  ];
}

// Performance metrics fetching functions
export const fetchSchoolPerformance = async (schoolId?: string, filters?: AnalyticsFilters): Promise<any> => {
  try {
    // Validate schoolId to prevent UUID format errors
    const validSchoolId = getMockOrValidUUID(schoolId);
    
    if (!validSchoolId) {
      console.log("fetchSchoolPerformance: Invalid or missing school ID, returning mock data");
      return generateMockSchoolPerformance();
    }
    
    // Mock implementation for fetching school performance data
    const monthlyData = [
      { month: 'Jan', score: 78 },
      { month: 'Feb', score: 82 },
      { month: 'Mar', score: 85 },
    ];
    
    const summary = {
      averageScore: 82,
      trend: 'up',
      changePercentage: 5,
    };
    
    return { monthlyData, summary };
  } catch (error) {
    console.error("Error in fetchSchoolPerformance:", error);
    return generateMockSchoolPerformance();
  }
};

function generateMockSchoolPerformance(): any {
  return {
    monthlyData: [
      { month: 'Jan', score: 78 },
      { month: 'Feb', score: 82 },
      { month: 'Mar', score: 85 },
    ],
    summary: {
      averageScore: 82,
      trend: 'up',
      changePercentage: 5,
    }
  };
}

export const fetchTeacherPerformance = async (schoolId?: string, filters?: AnalyticsFilters): Promise<any[]> => {
  try {
    // Validate schoolId to prevent UUID format errors
    const validSchoolId = getMockOrValidUUID(schoolId);
    
    if (!validSchoolId) {
      console.log("fetchTeacherPerformance: Invalid or missing school ID, returning mock data");
      return generateMockTeacherPerformance();
    }
    
    // Mock implementation for fetching teacher performance data
    const teacherPerformanceData = [
      { id: 1, name: 'Teacher 1', students: 10, avgScore: 82, trend: 'up' },
      { id: 2, name: 'Teacher 2', students: 8, avgScore: 78, trend: 'down' },
    ];
    
    return teacherPerformanceData;
  } catch (error) {
    console.error("Error in fetchTeacherPerformance:", error);
    return generateMockTeacherPerformance();
  }
};

function generateMockTeacherPerformance(): any[] {
  return [
    { id: 1, name: 'Teacher 1', students: 10, avgScore: 82, trend: 'up' },
    { id: 2, name: 'Teacher 2', students: 8, avgScore: 78, trend: 'down' },
  ];
}

export const fetchStudentPerformance = async (schoolId?: string, filters?: AnalyticsFilters): Promise<any[]> => {
  try {
    // Validate schoolId to prevent UUID format errors
    const validSchoolId = getMockOrValidUUID(schoolId);
    
    if (!validSchoolId) {
      console.log("fetchStudentPerformance: Invalid or missing school ID, returning mock data");
      return generateMockStudentPerformance();
    }
    
    // Mock implementation for fetching student performance data
    const studentPerformanceData = [
      { id: 1, name: 'Student 1', teacher: 'Teacher 1', avgScore: 85, trend: 'up', subjects: ['Math', 'Science'] },
      { id: 2, name: 'Student 2', teacher: 'Teacher 1', avgScore: 79, trend: 'steady', subjects: ['English', 'History'] },
    ];
    
    return studentPerformanceData;
  } catch (error) {
    console.error("Error in fetchStudentPerformance:", error);
    return generateMockStudentPerformance();
  }
};

function generateMockStudentPerformance(): any[] {
  return [
    { id: 1, name: 'Student 1', teacher: 'Teacher 1', avgScore: 85, trend: 'up', subjects: ['Math', 'Science'] },
    { id: 2, name: 'Student 2', teacher: 'Teacher 1', avgScore: 79, trend: 'steady', subjects: ['English', 'History'] },
  ];
}

export const fetchStudents = async (schoolId?: string): Promise<Student[]> => {
  try {
    // Validate schoolId to prevent UUID format errors
    const validSchoolId = getMockOrValidUUID(schoolId);
    
    if (!validSchoolId) {
      console.log("fetchStudents: Invalid or missing school ID, returning mock data");
      return generateMockStudents();
    }
    
    // Fetch student records
    const { data: students, error: studentsError } = await safeQuery(() => 
      supabase
        .from('students')
        .select('id, school_id, status')
        .eq('school_id', validSchoolId)
        .eq('status', 'active')
    );
    
    if (studentsError || !students || students.length === 0) {
      console.error("Error or no data in fetchStudents:", studentsError);
      return generateMockStudents();
    }
    
    // Fetch profiles separately to avoid relation errors
    const studentIds = students.map(student => student.id);
    const { data: profiles, error: profilesError } = await safeQuery(() => 
      supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds)
    );
    
    if (profilesError || !profiles) {
      console.error("Error fetching student profiles:", profilesError);
      return generateMockStudents();
    }
    
    // Create a lookup map for student names
    const profileMap = new Map();
    profiles.forEach(profile => {
      profileMap.set(profile.id, profile.full_name);
    });
    
    // Combine the data
    return students.map(student => ({
      id: student.id,
      name: profileMap.get(student.id) || 'Unknown Student',
      status: student.status
    }));
  } catch (error) {
    console.error("Error in fetchStudents:", error);
    return generateMockStudents();
  }
};

function generateMockStudents(): Student[] {
  return Array(5).fill(null).map((_, i) => ({
    id: `student-${i + 1}`,
    name: `Mock Student ${i + 1}`,
    status: 'active'
  }));
}

export const fetchTeachers = async (schoolId?: string): Promise<Teacher[]> => {
  try {
    // Validate schoolId to prevent UUID format errors
    const validSchoolId = getMockOrValidUUID(schoolId);
    
    if (!validSchoolId) {
      console.log("fetchTeachers: Invalid or missing school ID, returning mock data");
      return generateMockTeachers();
    }
    
    // Fetch teacher records
    const { data: teachers, error: teachersError } = await safeQuery(() => 
      supabase
        .from('teachers')
        .select('id, school_id, is_supervisor')
        .eq('school_id', validSchoolId)
    );
    
    if (teachersError || !teachers || teachers.length === 0) {
      console.error("Error or no data in fetchTeachers:", teachersError);
      return generateMockTeachers();
    }
    
    // Fetch profiles separately to avoid relation errors
    const teacherIds = teachers.map(teacher => teacher.id);
    const { data: profiles, error: profilesError } = await safeQuery(() => 
      supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds)
    );
    
    if (profilesError || !profiles) {
      console.error("Error fetching teacher profiles:", profilesError);
      return generateMockTeachers();
    }
    
    // Create a lookup map for teacher names
    const profileMap = new Map();
    profiles.forEach(profile => {
      profileMap.set(profile.id, profile.full_name);
    });
    
    // Combine the data
    return teachers.map(teacher => ({
      id: teacher.id,
      name: profileMap.get(teacher.id) || 'Unknown Teacher',
      isSupervisor: teacher.is_supervisor
    }));
  } catch (error) {
    console.error("Error in fetchTeachers:", error);
    return generateMockTeachers();
  }
};

function generateMockTeachers(): Teacher[] {
  return Array(3).fill(null).map((_, i) => ({
    id: `teacher-${i + 1}`,
    name: `Mock Teacher ${i + 1}`,
    isSupervisor: i === 0 // First teacher is supervisor
  }));
}
