
import { supabase } from '@/integrations/supabase/client';
import { DateRange, TeacherAnalyticsData } from '@/components/analytics/types';

// Add the missing fetchTeacherAnalytics function
export async function fetchTeacherAnalytics(schoolId: string, dateRange?: DateRange) {
  try {
    const startDate = dateRange?.from ? new Date(dateRange.from).toISOString() : undefined;
    const endDate = dateRange?.to ? new Date(dateRange.to).toISOString() : undefined;
    
    const { data, error } = await supabase.rpc(
      'get_teacher_performance_metrics',
      { 
        p_school_id: schoolId,
        p_start_date: startDate,
        p_end_date: endDate 
      }
    );
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching teacher analytics:', error);
    return [];
  }
}

// Add the missing adaptTeacherAnalyticsData function
export function adaptTeacherAnalyticsData(data: any[]): TeacherAnalyticsData[] {
  return data.map(item => ({
    id: item.teacher_id,
    name: item.teacher_name || 'Unknown',
    assessmentsCount: item.assessments_created || 0,
    averageScore: item.avg_student_score || 0,
    completionRate: item.completion_rate || 0,
    studentsAssessed: item.students_assessed || 0
  }));
}
