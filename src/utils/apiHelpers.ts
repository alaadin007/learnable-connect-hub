import { supabase } from '@/integrations/supabase/client';
import { UserType, ProfileData } from '@/types/profile';
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
import { processProfileData } from '@/utils/analyticsUtils';

// Define UserType enum and export it
export type UserRole = 'student' | 'teacher' | 'school_admin' | 'teacher_supervisor';

// Helper functions

/**
 * Check if a value is not null or undefined
 */
export function hasData<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Safe cast from string to UUID (for Supabase)
 * @param id String ID to cast to UUID
 */
export function safeUUID(id: string | null | undefined): string | null {
  return id || null;
}

/**
 * Safe access to API key
 */
export async function safeApiKeyAccess(provider: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('api_key')
      .eq('provider', provider)
      .eq('user_id', await supabase.auth.getUser().then(res => res.data.user?.id))
      .single();

    if (error || !data) {
      console.error('Error fetching API key:', error);
      return null;
    }

    return data.api_key;
  } catch (err) {
    console.error('Failed to fetch API key:', err);
    return null;
  }
}

/**
 * Safe cast for school ID
 */
export function asSchoolId(id: string): string {
  return id;
}

/**
 * Safe cast for school code
 */
export function asSchoolCode(code: string): string {
  return code;
}

/**
 * Type-safe ID cast
 */
export function asId(id: string): string {
  return id;
}

/**
 * Type-safe array cast
 */
export function safeArrayCast<T>(data: any): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  return [];
}

/**
 * Check if an object has a property
 */
export function hasProperty<T, K extends PropertyKey>(obj: T, prop: K): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Check if value is not null or undefined
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Insert a new school
 */
export async function insertSchool(school: {
  name: string;
  code: string;
  contact_email?: string;
}) {
  return await supabase
    .from('schools')
    .insert(school)
    .select()
    .single();
}

/**
 * Insert a new school code
 */
export async function insertSchoolCode(schoolCode: {
  code: string;
  school_id?: string;
  school_name: string;
  active: boolean;
}) {
  return await supabase
    .from('school_codes')
    .insert(schoolCode)
    .select()
    .single();
}

/**
 * Insert a student invite
 */
export async function insertStudentInvite(invite: {
  code?: string;
  email?: string;
  school_id: string;
  status: string;
  expires_at?: string;
}) {
  return await supabase
    .from('student_invites')
    .insert(invite)
    .select()
    .single();
}

/**
 * Update student status
 */
export async function updateStudentStatus(studentId: string, status: string) {
  return await supabase
    .from('students')
    .update({ status })
    .eq('id', studentId);
}

/**
 * Get students for school
 */
export async function getStudentsForSchool(schoolId: string) {
  return await supabase
    .rpc('get_students_for_school', { school_id_param: schoolId });
}

/**
 * Get student invites for school
 */
export async function getStudentInvitesForSchool(schoolId: string) {
  return await supabase
    .from('student_invites')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
}

/**
 * Process student data safely
 */
export function safeStudentData(data: any): { id: string; full_name: string | null; email: string; created_at: string } | null {
  if (data && typeof data === 'object' && 'id' in data) {
    return {
      id: data.id,
      full_name: data.full_name || null,
      email: data.email || `${data.id}@unknown.com`,
      created_at: data.created_at || new Date().toISOString()
    };
  }
  return null;
}

/**
 * Insert a document
 */
export async function insertDocument(document: {
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  processing_status: string;
  user_id: string;
  school_id: string | null;
}) {
  return await supabase
    .from('documents')
    .insert(document)
    .select()
    .single();
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string) {
  return await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);
}

/**
 * Delete document content
 */
export async function deleteDocumentContent(documentId: string) {
  return await supabase
    .from('document_content')
    .delete()
    .eq('document_id', documentId);
}

/**
 * Create a profile with type safety
 */
export async function createProfile(profile: Omit<ProfileData, 'id'> & { id?: string }): Promise<ProfileData | null> {
  try {
    // Ensure we have a valid id, otherwise get it from auth
    const id = profile.id || (await supabase.auth.getUser()).data.user?.id;
    
    if (!id) {
      throw new Error("User ID is required to create a profile");
    }

    // Create the profile with the id
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        ...profile,
        id: id
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return processProfileData(data);
  } catch (err) {
    console.error('Error creating profile:', err);
    return null;
  }
}

/**
 * Insert profile data into profiles table
 */
export async function insertProfile(profile: {
  id: string;
  user_type: UserType;
  full_name: string;
  email?: string;
  school_id?: string;
  school_code?: string;
  school_name?: string;
  is_active?: boolean;
}) {
  return await supabase
    .from('profiles')
    .insert({
      ...profile,
    })
    .select()
    .single();
}

/**
 * Insert a student record
 */
export async function insertStudent(student: {
  id: string;
  school_id: string;
  status: string;
}) {
  return await supabase
    .from('students')
    .insert(student)
    .select()
    .single();
}

/**
 * Insert a teacher record
 */
export async function insertTeacher(teacher: {
  id: string;
  school_id: string;
  is_supervisor: boolean;
}) {
  return await supabase
    .from('teachers')
    .insert(teacher)
    .select()
    .single();
}

/**
 * Get user profile data
 */
export async function getUserProfile(userId?: string): Promise<ProfileData | null> {
  try {
    let uid = userId;
    
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }
    
    if (!uid) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
      
    if (error) throw error;
    
    return processProfileData(data);
  } catch (err) {
    console.error('Error getting user profile:', err);
    return null;
  }
}

/**
 * Update a profile with type safety
 */
export async function updateProfile(profile: Partial<ProfileData> & { id: string }): Promise<ProfileData | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', profile.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return processProfileData(data);
  } catch (err) {
    console.error('Error updating profile:', err);
    return null;
  }
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
export function isSchoolAdmin(userRole: UserRole): boolean {
  if (!userRole) return false;
  // Fix the comparison by checking the string value directly
  return userRole === 'school_admin' || userRole === 'teacher_supervisor';
}

/**
 * Get user's school ID from database
 */
export async function getUserSchoolId(userId?: string): Promise<string | null> {
  try {
    let uid = userId;
    
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser();
      uid = authData.user?.id;
    }
    
    if (!uid) return null;
    
    // Try to get from teachers table first
    let { data: teacherData } = await supabase
      .from('teachers')
      .select('school_id')
      .eq('id', uid)
      .maybeSingle();
      
    if (teacherData?.school_id) {
      return teacherData.school_id;
    }
    
    // If not found, try students table
    let { data: studentData } = await supabase
      .from('students')
      .select('school_id')
      .eq('id', uid)
      .maybeSingle();
      
    if (studentData?.school_id) {
      return studentData.school_id;
    }
    
    // If still not found, try profiles table as last resort
    let { data: profileData } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', uid)
      .maybeSingle();
      
    return profileData?.school_id || null;
  } catch (err) {
    console.error('Error getting user school ID:', err);
    return null;
  }
}

/**
 * Get school ID with fallback for legacy components
 */
export async function getSchoolIdWithFallback(defaultId: string = 'test-school-0'): Promise<string> {
  try {
    const schoolId = await getUserSchoolId();
    return schoolId || defaultId;
  } catch (error) {
    return defaultId;
  }
}

// Synchronous version for components that can't handle async
export function getSchoolIdSync(defaultId: string = 'test-school-0'): string {
  // Use a default value until the async function resolves
  return defaultId;
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

// Export aliases for backward compatibility
export {
  getTopics as getPopularTopics,
  getStudyTime as getStudentStudyTime
};

// Placeholder functions for missing exports referenced in AnalyticsDashboard
export function getStudentPerformance(schoolId: string): Promise<any[]> {
  return Promise.resolve([]);
}

export function getSchoolPerformance(schoolId: string): Promise<any[]> {
  return Promise.resolve([]);
}

export function getSchoolPerformanceSummary(schoolId: string): Promise<SchoolPerformanceSummary> {
  return Promise.resolve({
    total_assessments: 0,
    total_students: 0,
    students_with_submissions: 0,
    student_participation_rate: 0,
    avg_score: 0,
    completion_rate: 0,
    improvement_rate: 0,
    avg_submissions_per_assessment: 0
  });
}
