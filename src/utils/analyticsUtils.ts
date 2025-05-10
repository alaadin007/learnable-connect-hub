import { supabase } from '@/integrations/supabase/client';
import { ProfileData } from '@/types/profile';
import { format } from 'date-fns';
import { 
  DateRange, 
  AnalyticsFilters, 
  SessionData, 
  TopicData, 
  StudyTimeData,
  AnalyticsSummary,
  SchoolPerformanceSummary 
} from '@/components/analytics/types';

// Helper function to process profile data from Supabase
export function processProfileData(data: any): ProfileData {
  let processedOrg: { id: string; name?: string; code?: string; } | undefined;
  
  if (data.organization) {
    if (typeof data.organization === 'object' && !Array.isArray(data.organization)) {
      // Handle organization object 
      processedOrg = {
        id: data.organization.id || data.school_id || '',
        name: data.organization.name || data.school_name,
        code: data.organization.code || data.school_code
      };
    } else if (data.school_id) {
      // Fallback to school data
      processedOrg = {
        id: data.school_id,
        name: data.school_name,
        code: data.school_code
      };
    }
  } else if (data.school_id) {
    // Create organization from school data
    processedOrg = {
      id: data.school_id,
      name: data.school_name,
      code: data.school_code
    };
  }
  
  // Create processed profile with correctly typed organization
  return {
    ...data,
    organization: processedOrg
  } as ProfileData;
}

/**
 * Get user role with fallback value
 */
export function getUserRoleWithFallback(fallback: string = 'student'): string {
  // Try to get from localStorage first
  const storedRole = localStorage.getItem('userRole');
  if (storedRole) {
    return storedRole;
  }
  
  return fallback;
}

/**
 * Check if user is a school admin
 */
export function isSchoolAdmin(userRole: string | null | undefined): boolean {
  if (!userRole) return false;
  // Fix the comparison by checking string values
  return userRole === 'school_admin' || userRole === 'teacher_supervisor';
}

/**
 * Get analytics summary data from database
 */
export async function getAnalyticsSummary(schoolId: string): Promise<AnalyticsSummary> {
  try {
    const { data, error } = await supabase
      .from('school_analytics_summary')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();
      
    if (error) throw error;
    
    // Map to the expected AnalyticsSummary format
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
  } catch (err) {
    console.error('Error getting analytics summary:', err);
    return {
      activeStudents: 0,
      totalSessions: 0,
      totalQueries: 0,
      avgSessionMinutes: 0
    };
  }
}

/**
 * Get session logs data from database
 */
export async function getSessionLogs(schoolId: string, filters?: AnalyticsFilters): Promise<SessionData[]> {
  try {
    let query = supabase
      .from('session_logs')
      .select(`
        *,
        student:user_id (
          full_name
        )
      `)
      .eq('school_id', schoolId)
      .order('session_start', { ascending: false });
      
    // Apply date filters if provided
    if (filters?.dateRange) {
      if (filters.dateRange.from) {
        query = query.gte('session_start', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange.to) {
        query = query.lte('session_start', filters.dateRange.to.toISOString());
      }
    }
    
    const { data, error } = await query;
      
    if (error) throw error;
    
    // Map to SessionData format
    return data?.map(session => ({
      id: session.id,
      student_id: session.user_id,
      student_name: session.student?.full_name || 'Unknown Student',
      start_time: session.session_start,
      end_time: session.session_end,
      duration_minutes: session.session_end ? 
        Math.round((new Date(session.session_end).getTime() - new Date(session.session_start).getTime()) / 60000) : 
        0,
      queries_count: session.num_queries || 0,
      topic: session.topic_or_content_used
    })) || [];
  } catch (err) {
    console.error('Error getting session logs:', err);
    return [];
  }
}

/**
 * Get popular topics data
 */
export async function getTopics(schoolId: string, filters?: AnalyticsFilters): Promise<TopicData[]> {
  try {
    const { data, error } = await supabase
      .from('most_studied_topics')
      .select('*')
      .eq('school_id', schoolId);
      
    if (error) throw error;
    
    // Calculate percentages
    const totalCount = data?.reduce((sum, item) => sum + (item.count_of_sessions || 0), 0) || 0;
    
    return data?.map(item => ({
      id: item.topic_or_content_used || `topic-${Math.random().toString(36).substring(7)}`,
      topic: item.topic_or_content_used || 'Unknown Topic',
      count: item.count_of_sessions || 0,
      percentage: totalCount ? Math.round((item.count_of_sessions || 0) / totalCount * 100) : 0,
      // Add compatibility fields
      name: item.topic_or_content_used || 'Unknown Topic',
      value: item.count_of_sessions || 0
    })) || [];
  } catch (err) {
    console.error('Error getting popular topics:', err);
    return [];
  }
}

/**
 * Get student study time data
 */
export async function getStudyTime(schoolId: string, filters?: AnalyticsFilters): Promise<StudyTimeData[]> {
  try {
    const { data, error } = await supabase
      .from('student_weekly_study_time')
      .select('*')
      .eq('school_id', schoolId);
      
    if (error) throw error;
    
    return data?.map(item => ({
      student_id: item.user_id || '',
      student_name: item.student_name || 'Unknown Student',
      total_minutes: Math.round((item.study_hours || 0) * 60),
      sessions_count: 0, // This might need to be calculated separately
      // Add compatibility fields
      name: item.student_name || 'Unknown Student',
      studentName: item.student_name || 'Unknown Student',
      hours: item.study_hours || 0
    })) || [];
  } catch (err) {
    console.error('Error getting student study time:', err);
    return [];
  }
}

/**
 * Format a date range as a readable string
 */
export function getDateRangeText(dateRange?: DateRange): string {
  if (!dateRange) return 'All Time';
  
  const fromDate = dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : '';
  const toDate = dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Present';
  
  return `${fromDate} to ${toDate}`;
}

/**
 * Export analytics data to CSV
 */
export function exportAnalyticsToCSV(
  summary: AnalyticsSummary,
  sessions: SessionData[],
  topics: TopicData[],
  studyTime: StudyTimeData[],
  dateRangeText: string
): void {
  // Create CSV for sessions
  const sessionsCSV = [
    'Student Name,Start Time,End Time,Duration (min),Queries,Topic',
    ...sessions.map(s => 
      `"${s.student_name}","${s.start_time}","${s.end_time || ''}",${s.duration_minutes},${s.queries_count},"${s.topic || ''}"`)
  ].join('\n');
  
  downloadCSV(sessionsCSV, `sessions-${dateRangeText.replace(/\s+/g, '-')}.csv`);
  
  // Create CSV for topics
  const topicsCSV = [
    'Topic,Count,Percentage',
    ...topics.map(t => `"${t.topic}",${t.count},${t.percentage}%`)
  ].join('\n');
  
  downloadCSV(topicsCSV, `topics-${dateRangeText.replace(/\s+/g, '-')}.csv`);
  
  // Create CSV for study time
  const studyTimeCSV = [
    'Student,Total Minutes,Sessions',
    ...studyTime.map(s => `"${s.student_name}",${s.total_minutes},${s.sessions_count}`)
  ].join('\n');
  
  downloadCSV(studyTimeCSV, `study-time-${dateRangeText.replace(/\s+/g, '-')}.csv`);
}

/**
 * Download data as a CSV file
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
