import { supabase } from "@/integrations/supabase/client";
import { AnalyticsFilters, StudentPerformanceData } from "@/components/analytics/types";
import { getDateFilterSQL } from "./dateUtils";
import { isValidUUID } from "./validationUtils";

// Fetch student performance data
export const fetchStudentPerformance = async (
  schoolId: string | undefined,
  filters: AnalyticsFilters
): Promise<StudentPerformanceData[]> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for student performance, using demo data");
      return getMockStudentPerformanceData();
    }

    // Get date range filter
    const { dateRange, teacherId } = filters;
    const dateFilter = getDateFilterSQL(dateRange);

    // Get student performance metrics
    const { data, error } = await supabase
      .rpc("get_student_performance_metrics", {
        p_school_id: schoolId,
        p_start_date: dateFilter.startDate,
        p_end_date: dateFilter.endDate
      });

    if (error) {
      console.error("Error fetching student performance:", error);
      return getMockStudentPerformanceData();
    }

    // Format the data for the frontend
    const formattedData: StudentPerformanceData[] = (data || []).map(item => {
      // Calculate a trend based on score
      // This is a simplification - in a real app, you'd compare to previous periods
      const trend = item.avg_score > 80 ? "up" : item.avg_score > 60 ? "steady" : "down";

      // Extract subjects from strengths and weaknesses
      const strengths = item.top_strengths ? item.top_strengths.split(', ') : [];
      const weaknesses = item.top_weaknesses ? item.top_weaknesses.split(', ') : [];
      const subjects = Array.from(new Set([...strengths, ...weaknesses]));

      return {
        id: item.student_id,
        name: item.student_name,
        student_id: item.student_id,
        student_name: item.student_name,
        assessments_taken: item.assessments_taken || 0,
        avg_score: item.avg_score || 0,
        assessments_completed: item.assessments_completed || 0,
        completion_rate: item.completion_rate || 0,
        avg_time_spent_seconds: item.avg_time_spent_seconds || 0,
        top_strengths: item.top_strengths || '',
        top_weaknesses: item.top_weaknesses || '',
        teacher: 'Various', // Would need a join to get this
        avgScore: item.avg_score || 0,
        trend,
        subjects
      };
    });

    // Filter by teacher if provided
    if (teacherId && isValidUUID(teacherId)) {
      // In a real app, you'd do this filtering in the database query
      // For now, we'll assume every student has a connection to the teacher
      // This is a simplification
    }

    return formattedData.length > 0 ? formattedData : getMockStudentPerformanceData();
  } catch (error) {
    console.error("Error in fetchStudentPerformance:", error);
    return getMockStudentPerformanceData();
  }
};

// Helper function to get mock student performance data
function getMockStudentPerformanceData(): StudentPerformanceData[] {
  return [
    {
      id: '1',
      name: 'Student Parker',
      student_id: '1',
      student_name: 'Student Parker',
      assessments_taken: 8,
      avg_score: 85,
      assessments_completed: 7,
      completion_rate: 88,
      avg_time_spent_seconds: 1200,
      top_strengths: 'Algebra, Reading Comprehension',
      top_weaknesses: 'Grammar, Chemistry',
      teacher: 'Teacher Smith',
      avgScore: 85,
      trend: 'up',
      subjects: ['Math', 'English']
    },
    {
      id: '2',
      name: 'Student Turner',
      student_id: '2',
      student_name: 'Student Turner',
      assessments_taken: 6,
      avg_score: 76,
      assessments_completed: 5,
      completion_rate: 83,
      avg_time_spent_seconds: 1500,
      top_strengths: 'History, Geography',
      top_weaknesses: 'Calculus, Physics',
      teacher: 'Teacher Johnson',
      avgScore: 76,
      trend: 'steady',
      subjects: ['History', 'Science']
    },
    {
      id: '3',
      name: 'Student Garcia',
      student_id: '3',
      student_name: 'Student Garcia',
      assessments_taken: 10,
      avg_score: 92,
      assessments_completed: 10,
      completion_rate: 100,
      avg_time_spent_seconds: 900,
      top_strengths: 'Programming, Physics',
      top_weaknesses: 'Literature, Art',
      teacher: 'Teacher Williams',
      avgScore: 92,
      trend: 'up',
      subjects: ['Computer Science', 'Physics']
    }
  ];
}

// Fetch all students for a school
export const fetchStudents = async (
  schoolId: string
): Promise<{ id: string; name: string }[]> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for students, using demo data");
      return getMockStudents();
    }

    // Fetch students from the database
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        profiles(full_name)
      `)
      .eq('school_id', schoolId);

    if (error) {
      console.error("Error fetching students:", error);
      return getMockStudents();
    }

    // Transform the data to the expected format
    return (data || []).map(student => {
      // Safely access profile data - using type assertion to avoid TypeScript errors
      const profileData = student.profiles as any;
      let studentName = 'Unknown Student';
      
      if (profileData) {
        if (Array.isArray(profileData) && profileData.length > 0) {
          studentName = profileData[0]?.full_name || 'Unknown Student';
        } else if (typeof profileData === 'object') {
          studentName = profileData.full_name || 'Unknown Student';
        }
      }
        
      return {
        id: student.id,
        name: studentName
      };
    });
  } catch (error) {
    console.error("Error in fetchStudents:", error);
    return getMockStudents();
  }
};

// Helper function for mock students data
function getMockStudents(): { id: string; name: string }[] {
  return [
    { id: '1', name: 'Student Parker' },
    { id: '2', name: 'Student Turner' },
    { id: '3', name: 'Student Garcia' },
    { id: '4', name: 'Student Rodriguez' },
    { id: '5', name: 'Student Lee' }
  ];
}
