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

// Define UserRole type and export it
export type UserRole = 'student' | 'teacher' | 'school_admin' | 'teacher_supervisor' | 'school';

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

export function asSchoolId(id: string): string {
  return id;
}

export function asSchoolCode(code: string): string {
  return code;
}

export function asId(id: string): string {
  return id;
}

export function safeArrayCast<T>(data: any): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  return [];
}

export function hasProperty<T, K extends PropertyKey>(obj: T, prop: K): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

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

export async function updateStudentStatus(studentId: string, status: string) {
  return await supabase
    .from('students')
    .update({ status })
    .eq('id', studentId);
}

export async function getStudentsForSchool(schoolId: string) {
  return await supabase
    .rpc('get_students_for_school', { school_id_param: schoolId });
}

export async function getStudentInvitesForSchool(schoolId: string) {
  return await supabase
    .from('student_invites')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
}

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

export async function deleteDocument(documentId: string) {
  return await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);
}

export async function deleteDocumentContent(documentId: string) {
  return await supabase
    .from('document_content')
    .delete()
    .eq('document_id', documentId);
}

export const processProfileData = (data: any): ProfileData | null => {
  if (!data) return null;
  
  return {
    id: data.id,
    user_type: data.user_type,
    full_name: data.full_name,
    email: data.email,
    school_id: data.school_id,
    school_code: data.school_code,
    school_name: data.school_name,
    is_supervisor: data.is_supervisor,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

export async function createProfile(profile: Omit<ProfileData, 'id'> & { id?: string, user_type: string }): Promise<ProfileData | null> {
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

export async function insertProfile(profile: {
  id: string;
  user_type: string;
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

export function getUserRoleWithFallback(fallback: string = 'student'): string {
  // Try to get from localStorage first
  const storedRole = localStorage.getItem('userRole');
  if (storedRole) {
    return storedRole;
  }
  
  return fallback;
}

export function isSchoolAdmin(userRole: UserRole | null | undefined): boolean {
  if (!userRole) return false;
  // Fix the comparison by checking the string value directly
  return userRole === 'school_admin' || userRole === 'teacher_supervisor';
}

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

export async function getSchoolIdWithFallback(defaultId: string = 'test-school-0'): Promise<string> {
  try {
    const schoolId = await getUserSchoolId();
    return schoolId || defaultId;
  } catch (error) {
    return defaultId;
  }
}

export function getSchoolIdSync(defaultId: string = 'test-school-0'): string {
  // Use a default value until the async function resolves
  return defaultId;
}

// Import these functions from analyticsUtils to avoid duplication
import { 
  getAnalyticsSummary, 
  getSessionLogs, 
  getTopics,
  getStudyTime
} from './analyticsUtils';

// Re-export for backward compatibility
export { 
  getAnalyticsSummary, 
  getSessionLogs, 
  getTopics,
  getStudyTime
};

// Updated functions to use the new security definer functions
export async function getStudentPerformance(schoolId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_student_performance_metrics_view', {
      p_school_id: schoolId
    });
    
    if (error) {
      console.error('Error fetching student performance:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getStudentPerformance:', error);
    return [];
  }
}

export async function getSchoolPerformance(schoolId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_school_performance_metrics_view', {
      p_school_id: schoolId
    });
    
    if (error) {
      console.error('Error fetching school performance:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getSchoolPerformance:', error);
    return [];
  }
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

// New function to get session query counts using the security definer function
export async function getSessionQueryCounts(schoolId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_session_query_counts', {
      p_school_id: schoolId
    });
    
    if (error) {
      console.error('Error fetching session query counts:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getSessionQueryCounts:', error);
    return [];
  }
}
