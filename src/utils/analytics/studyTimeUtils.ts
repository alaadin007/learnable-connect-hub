
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsFilters, StudyTimeData } from "@/components/analytics/types";
import { getDateFilterSQL } from "./dateUtils";
import { isValidUUID } from "./validationUtils";
import { getMockStudyTimeData } from "./mockDataUtils";

// Fetch study time data
export const fetchStudyTime = async (
  schoolId: string | undefined,
  filters: AnalyticsFilters
): Promise<StudyTimeData[]> => {
  try {
    // Validate school ID
    if (!schoolId || !isValidUUID(schoolId)) {
      console.warn("Invalid school ID for study time, using demo data");
      return getMockStudyTimeData();
    }

    // Get date range filter
    const { dateRange, studentId } = filters;
    const dateFilter = getDateFilterSQL(dateRange);

    // Build the query
    let query = supabase
      .from('session_logs')
      .select(`
        user_id,
        session_start,
        session_end,
        profiles:profiles(full_name)
      `)
      .eq('school_id', schoolId)
      .gte('session_start', dateFilter.startDate)
      .lte('session_start', dateFilter.endDate);

    // Add student filter if provided
    if (studentId && isValidUUID(studentId)) {
      query = query.eq('user_id', studentId);
    }

    // Execute the query with proper await
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching study time:", error);
      return getMockStudyTimeData();
    }

    // Group by student and calculate total study time
    const studyTimeByStudent: Record<string, {
      student_id: string;
      student_name: string;
      total_minutes: number;
    }> = {};

    (data || []).forEach(session => {
      if (session.session_start && session.session_end) {
        const studentId = session.user_id;
        const studentName = session.profiles?.full_name || 'Unknown Student';
        const start = new Date(session.session_start);
        const end = new Date(session.session_end);
        let minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

        // Cap very long sessions at 4 hours (240 minutes)
        if (minutes < 0) minutes = 0;
        if (minutes > 240) minutes = 240;

        if (!studyTimeByStudent[studentId]) {
          studyTimeByStudent[studentId] = {
            student_id: studentId,
            student_name: studentName,
            total_minutes: 0
          };
        }

        studyTimeByStudent[studentId].total_minutes += minutes;
      }
    });

    // Format into the expected structure and sort by total time (descending)
    const studyTimeData: StudyTimeData[] = Object.values(studyTimeByStudent)
      .map(({ student_id, student_name, total_minutes }) => ({
        student_id,
        student_name,
        total_minutes,
        name: student_name, // For compatibility with components expecting 'name'
        studentName: student_name, // For compatibility with components expecting 'studentName'
        hours: parseFloat((total_minutes / 60).toFixed(1)),
        week: new Date().getWeek(), // This would need a proper implementation
        year: new Date().getFullYear()
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes);

    return studyTimeData;
  } catch (error) {
    console.error("Error in fetchStudyTime:", error);
    return getMockStudyTimeData();
  }
};
