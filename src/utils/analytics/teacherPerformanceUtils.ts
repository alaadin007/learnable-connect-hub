
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsFilters, TeacherPerformanceData } from "@/components/analytics/types";
import { getDateFilterSQL } from "./dateUtils";
import { isValidUUID } from "./validationUtils";

// Fetch teacher performance data
export const fetchTeacherPerformance = async (
  schoolId: string | undefined,
  filters: AnalyticsFilters
): Promise<TeacherPerformanceData[]> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for teacher performance, using demo data");
      return getMockTeacherPerformanceData();
    }

    // Get date range filter
    const { dateRange } = filters;
    const dateFilter = getDateFilterSQL(dateRange);

    // Get teacher performance metrics
    const { data, error } = await supabase
      .rpc("get_teacher_performance_metrics", {
        p_school_id: schoolId,
        p_start_date: dateFilter.startDate,
        p_end_date: dateFilter.endDate
      });

    if (error) {
      console.error("Error fetching teacher performance:", error);
      return getMockTeacherPerformanceData();
    }

    // Format the data for the frontend
    const formattedData: TeacherPerformanceData[] = (data || []).map(item => {
      // Calculate a trend based on completion rate
      // This is a simplification - in a real app, you'd compare to previous periods
      const trend = item.completion_rate > 80 ? "up" : item.completion_rate > 60 ? "steady" : "down";

      return {
        teacher_id: item.teacher_id,
        teacher_name: item.teacher_name,
        assessments_created: item.assessments_created || 0,
        students_assessed: item.students_assessed || 0,
        completion_rate: item.completion_rate || 0,
        avg_student_score: item.avg_student_score || 0,
        avg_submissions_per_assessment: item.avg_submissions_per_assessment || 0,
        
        // Compatibility fields
        id: item.teacher_id,
        name: item.teacher_name,
        students: item.students_assessed || 0,
        avgScore: item.avg_student_score || 0,
        trend
      };
    });

    return formattedData.length > 0 ? formattedData : getMockTeacherPerformanceData();
  } catch (error) {
    console.error("Error in fetchTeacherPerformance:", error);
    return getMockTeacherPerformanceData();
  }
};

// Helper function to get mock teacher performance data
function getMockTeacherPerformanceData(): TeacherPerformanceData[] {
  return [
    {
      teacher_id: '1',
      teacher_name: 'Teacher Smith',
      assessments_created: 12,
      students_assessed: 45,
      completion_rate: 86,
      avg_student_score: 82,
      avg_submissions_per_assessment: 3.2,
      id: '1',
      name: 'Teacher Smith',
      students: 45,
      avgScore: 82,
      trend: 'up'
    },
    {
      teacher_id: '2',
      teacher_name: 'Teacher Johnson',
      assessments_created: 8,
      students_assessed: 32,
      completion_rate: 71,
      avg_student_score: 76,
      avg_submissions_per_assessment: 2.8,
      id: '2',
      name: 'Teacher Johnson',
      students: 32,
      avgScore: 76,
      trend: 'steady'
    },
    {
      teacher_id: '3',
      teacher_name: 'Teacher Williams',
      assessments_created: 15,
      students_assessed: 50,
      completion_rate: 92,
      avg_student_score: 88,
      avg_submissions_per_assessment: 3.5,
      id: '3',
      name: 'Teacher Williams',
      students: 50,
      avgScore: 88,
      trend: 'up'
    }
  ];
}

// Fetch all teachers for a school
export const fetchTeachers = async (
  schoolId: string
): Promise<{ id: string; name: string }[]> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for teachers, using demo data");
      return getMockTeachers();
    }

    // Fetch teachers from the database
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        id,
        profiles(full_name)
      `)
      .eq('school_id', schoolId);

    if (error) {
      console.error("Error fetching teachers:", error);
      return getMockTeachers();
    }

    // Transform the data to the expected format
    return (data || []).map(teacher => {
      // Safely access profile data - using type assertion to avoid TypeScript errors
      const profileData = teacher.profiles as any;
      let teacherName = 'Unknown Teacher';
      
      if (profileData) {
        if (Array.isArray(profileData) && profileData.length > 0) {
          teacherName = profileData[0]?.full_name || 'Unknown Teacher';
        } else if (typeof profileData === 'object') {
          teacherName = profileData.full_name || 'Unknown Teacher';
        }
      }
        
      return {
        id: teacher.id,
        name: teacherName
      };
    });
  } catch (error) {
    console.error("Error in fetchTeachers:", error);
    return getMockTeachers();
  }
};

// Helper function for mock teachers data
function getMockTeachers(): { id: string; name: string }[] {
  return [
    { id: '1', name: 'Teacher Smith' },
    { id: '2', name: 'Teacher Johnson' },
    { id: '3', name: 'Teacher Williams' },
    { id: '4', name: 'Teacher Brown' },
    { id: '5', name: 'Teacher Jones' }
  ];
}
