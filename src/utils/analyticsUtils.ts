
import { supabase } from '@/integrations/supabase/client';
import { 
  Student, 
  AnalyticsSummary, 
  SessionData, 
  TopicData, 
  StudyTimeData 
} from '@/components/analytics/types';

// Helper function to generate mock analytics data
export const getMockAnalyticsData = (): AnalyticsSummary => {
  return {
    activeStudents: Math.floor(Math.random() * 50) + 10,
    totalSessions: Math.floor(Math.random() * 300) + 50,
    totalQueries: Math.floor(Math.random() * 2000) + 500,
    avgSessionMinutes: parseFloat((Math.random() * 30 + 5).toFixed(1))
  };
};

// Fetch analytics summary from database
export const fetchAnalyticsSummary = async (schoolId: string): Promise<AnalyticsSummary | null> => {
  try {
    const { data, error } = await supabase
      .from('school_analytics_summary')
      .select('*')
      .eq('school_id', schoolId)
      .single();

    if (error) throw error;

    if (data) {
      return {
        activeStudents: data.active_students || 0,
        totalSessions: data.total_sessions || 0,
        totalQueries: data.total_queries || 0,
        avgSessionMinutes: data.avg_session_minutes || 0
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return null;
  }
};

// Export other analytics utility functions as needed
