
// Import necessary functions
import { format } from 'date-fns';
import { getMockAnalyticsData } from './sessionLogging';
import { 
  AnalyticsFilters, 
  AnalyticsSummary,
  SessionData,
  TopicData,
  StudyTimeData,
  SchoolPerformanceSummary as SchoolPerfSummary,
  SchoolPerformanceData as SchoolPerfData,
  TeacherPerformanceData,
  StudentPerformanceData,
  DateRange
} from '@/components/analytics/types';

// Renamed the imported types to avoid conflicts
type SchoolPerformanceData = SchoolPerfData;
type SchoolPerformanceSummary = SchoolPerfSummary;

/**
 * Helper to create text representation of date range
 */
export const getDateRangeText = (dateRange?: DateRange): string => {
  if (!dateRange?.from) return 'All time';
  
  const fromDate = format(dateRange.from, 'MMM d, yyyy');
  const toDate = dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Present';
  
  return `${fromDate} to ${toDate}`;
};

/**
 * Fetch analytics summary data
 */
export const fetchAnalyticsSummary = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<AnalyticsSummary> => {
  // For test accounts, use mock data
  if (!schoolId || schoolId === 'test') {
    const mockData = getMockAnalyticsData(schoolId, filters);
    return mockData.summary;
  }
  
  try {
    // Implement real API logic here
    // This is just a placeholder
    return {
      activeStudents: 0,
      totalSessions: 0,
      totalQueries: 0,
      avgSessionMinutes: 0
    };
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    throw error;
  }
};

/**
 * Fetch session logs
 */
export const fetchSessionLogs = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<SessionData[]> => {
  // For test accounts, use mock data
  if (!schoolId || schoolId === 'test') {
    const mockData = getMockAnalyticsData(schoolId, filters).sessions;
    
    // Convert mock data to expected SessionData format
    return mockData.map(session => ({
      id: session.id,
      student_name: session.userName || "Unknown",
      student_id: session.userId || "",
      session_date: session.startTime || "",
      duration_minutes: typeof session.duration === 'string' ? 
        parseInt(session.duration) : 
        (typeof session.duration === 'number' ? session.duration : 0),
      topics: [session.topicOrContent || "General"],
      questions_asked: session.numQueries || session.queries || 0,
      questions_answered: session.numQueries || session.queries || 0,
      
      // Keep backward compatibility fields
      userId: session.userId,
      userName: session.userName,
      student: session.userName, // Change this from session.student
      topicOrContent: session.topicOrContent,
      topic: session.topicOrContent, // Change this from session.topic
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      numQueries: session.numQueries,
      queries: session.queries
    }));
  }
  
  try {
    // Implement real API logic here
    // This is just a placeholder
    return [];
  } catch (error) {
    console.error('Error fetching session logs:', error);
    throw error;
  }
};

/**
 * Fetch popular topics
 */
export const fetchTopics = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<TopicData[]> => {
  // For test accounts, use mock data
  if (!schoolId || schoolId === 'test') {
    const mockData = getMockAnalyticsData(schoolId, filters).topics;
    
    // Convert mock data to expected TopicData format
    return mockData.map(topicData => ({
      topic: topicData.topic || topicData.name || "",
      count: topicData.count || topicData.value || 0,
      
      // Keep backward compatibility fields
      name: topicData.name || topicData.topic,
      value: topicData.value || topicData.count
    }));
  }
  
  try {
    // Implement real API logic here
    // This is just a placeholder
    return [];
  } catch (error) {
    console.error('Error fetching topics:', error);
    throw error;
  }
};

/**
 * Fetch study time data
 */
export const fetchStudyTime = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<StudyTimeData[]> => {
  // For test accounts, use mock data
  if (!schoolId || schoolId === 'test') {
    const mockData = getMockAnalyticsData(schoolId, filters).studyTime;
    
    // Convert mock data to expected StudyTimeData format
    return mockData.map(studyData => ({
      student_name: studyData.studentName || studyData.name || "Unknown",
      student_id: "", // Mock data doesn't have student_id
      total_minutes: (studyData.hours || 0) * 60,
      
      // Keep backward compatibility fields
      studentName: studyData.studentName || studyData.name,
      name: studyData.name || studyData.studentName,
      hours: studyData.hours,
      week: studyData.week,
      year: studyData.year
    }));
  }
  
  try {
    // Implement real API logic here
    // This is just a placeholder
    return [];
  } catch (error) {
    console.error('Error fetching study time data:', error);
    throw error;
  }
};

/**
 * Fetch school performance data
 */
export const fetchSchoolPerformance = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<{
  monthlyData: SchoolPerformanceData[];
  summary: SchoolPerformanceSummary | null;
}> => {
  try {
    // For test accounts or development, return mock data
    if (!schoolId || schoolId === 'test') {
      // Generate mock monthly data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const monthlyData: SchoolPerformanceData[] = months.map(month => ({
        month: month,
        avg_monthly_score: 70 + Math.floor(Math.random() * 20),
        monthly_completion_rate: 75 + Math.floor(Math.random() * 15),
        score_improvement_rate: 5 + Math.floor(Math.random() * 10),
        completion_improvement_rate: 3 + Math.floor(Math.random() * 5),
        
        // Additional properties for utils compatibility
        average_score: 70 + Math.floor(Math.random() * 20),
        total_questions: 100 + Math.floor(Math.random() * 200)
      }));
      
      // Generate mock summary
      const summary: SchoolPerformanceSummary = {
        total_assessments: 120,
        students_with_submissions: 95,
        total_students: 110,
        avg_submissions_per_assessment: 4.2,
        avg_score: 85,
        completion_rate: 87,
        student_participation_rate: 92,
        
        // Additional properties for utils compatibility
        average_score: 85,
        total_questions: 1250,
        improvement_rate: 12.5
      };
      
      return { monthlyData, summary };
    }
    
    // For real accounts, implement API call here
    // This is just a placeholder
    return {
      monthlyData: [],
      summary: null
    };
  } catch (error) {
    console.error('Error fetching school performance:', error);
    return {
      monthlyData: [],
      summary: null
    };
  }
};

/**
 * Fetch teacher performance data
 */
export const fetchTeacherPerformance = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<TeacherPerformanceData[]> => {
  try {
    // For test accounts or development, return mock data
    if (!schoolId || schoolId === 'test') {
      const teacherNames = [
        'Ms. Johnson',
        'Mr. Smith',
        'Mrs. Davis',
        'Dr. Wilson',
        'Prof. Martinez'
      ];
      
      return teacherNames.map((name, index) => ({
        teacher_id: `teacher-${index}`,
        teacher_name: name,
        assessments_created: 10 + Math.floor(Math.random() * 15),
        students_assessed: 15 + Math.floor(Math.random() * 15),
        completion_rate: 70 + Math.floor(Math.random() * 25),
        avg_student_score: 70 + Math.floor(Math.random() * 25),
        avg_submissions_per_assessment: 3 + Math.floor(Math.random() * 4),
        
        // Additional properties for utils compatibility
        id: `teacher-${index}`,
        name: name,
        students_count: 15 + Math.floor(Math.random() * 15),
        average_score: 70 + Math.floor(Math.random() * 25),
        total_questions: 200 + Math.floor(Math.random() * 300),
        improvement_rate: Math.floor(Math.random() * 20) - 5
      }));
    }
    
    // For real accounts, implement API call here
    // This is just a placeholder
    return [];
  } catch (error) {
    console.error('Error fetching teacher performance:', error);
    return [];
  }
};

/**
 * Fetch student performance data
 */
export const fetchStudentPerformance = async (
  schoolId: string,
  filters: AnalyticsFilters
): Promise<StudentPerformanceData[]> => {
  try {
    // For test accounts or development, return mock data
    if (!schoolId || schoolId === 'test') {
      const studentNames = [
        'Emma Thompson',
        'Liam Johnson',
        'Olivia Davis',
        'Noah Wilson',
        'Ava Martinez',
        'Sophia Brown',
        'Jackson Lee',
        'Isabella Taylor',
        'Lucas Garcia',
        'Mia Robinson'
      ];
      
      const teacherNames = [
        'Ms. Johnson',
        'Mr. Smith',
        'Mrs. Davis',
        'Dr. Wilson',
        'Prof. Martinez'
      ];
      
      return studentNames.map((name, index) => {
        const today = new Date();
        const lastActive = new Date(today);
        lastActive.setDate(today.getDate() - Math.floor(Math.random() * 14));
        
        const avgScore = 65 + Math.floor(Math.random() * 30);
        const assessmentsTaken = 5 + Math.floor(Math.random() * 10);
        const assessmentsCompleted = Math.floor(assessmentsTaken * 0.8);
        
        return {
          student_id: `student-${index}`,
          student_name: name,
          assessments_taken: assessmentsTaken,
          avg_score: avgScore,
          avg_time_spent_seconds: 180 + Math.floor(Math.random() * 300),
          assessments_completed: assessmentsCompleted,
          completion_rate: Math.floor((assessmentsCompleted / assessmentsTaken) * 100),
          top_strengths: "Critical thinking, Analysis",
          top_weaknesses: "Time management, Organization",
          
          // Additional properties for utils compatibility
          id: `student-${index}`,
          name: name,
          teacher_name: teacherNames[Math.floor(Math.random() * teacherNames.length)],
          average_score: avgScore,
          total_questions: 50 + Math.floor(Math.random() * 150),
          improvement_rate: Math.floor(Math.random() * 25) - 5,
          last_active: format(lastActive, 'MMM d, yyyy')
        };
      });
    }
    
    // For real accounts, implement API call here
    // This is just a placeholder
    return [];
  } catch (error) {
    console.error('Error fetching student performance:', error);
    return [];
  }
};

/**
 * Export analytics data to CSV
 */
export const exportAnalyticsToCSV = (
  summary: AnalyticsSummary,
  sessions: SessionData[],
  topics: TopicData[],
  studyTimes: StudyTimeData[],
  dateRangeText: string
): void => {
  try {
    // Create CSV content for summary
    const summaryCSV = `Analytics Summary (${dateRangeText})
Active Students,${summary.activeStudents}
Total Sessions,${summary.totalSessions}
Total Queries,${summary.totalQueries}
Average Session Duration (minutes),${summary.avgSessionMinutes}

`;

    // Create CSV content for sessions
    let sessionsCSV = 'Student,Topic,Queries,Duration,Date\n';
    sessions.forEach(session => {
      sessionsCSV += `"${session.student_name}","${session.topics[0] || ''}",${session.questions_asked},${session.duration_minutes},"${session.session_date}"\n`;
    });
    sessionsCSV += '\n';

    // Create CSV content for topics
    let topicsCSV = 'Topic,Count\n';
    topics.forEach(topic => {
      topicsCSV += `"${topic.topic}",${topic.count}\n`;
    });
    topicsCSV += '\n';

    // Create CSV content for study time
    let studyTimeCSV = 'Student,Total Minutes\n';
    studyTimes.forEach(studyTime => {
      studyTimeCSV += `"${studyTime.student_name}",${studyTime.total_minutes}\n`;
    });

    // Combine all CSV content
    const csvContent = summaryCSV + sessionsCSV + topicsCSV + studyTimeCSV;

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting analytics data:', error);
  }
};
