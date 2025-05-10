
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
import { processProfileData } from '@/utils/analyticsUtils';

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

/**
 * Insert profile data into profiles table
 */
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
export function isSchoolAdmin(userRole: UserRole | null | undefined): boolean {
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

/**
 * Get school ID synchronously with fallback
 */
export function getSchoolIdSync(defaultId: string = 'test-school-0'): string {
  // Use a default value until the async function resolves
  return defaultId;
}

// Import these functions from analyticsUtils to avoid duplication
import { 
  getAnalyticsSummary, 
  getSessionLogs, 
  getTopics,
  getStudyTime,
  getPopularTopics,
  getStudentStudyTime 
} from './analyticsUtils';

// Re-export for backward compatibility
export { 
  getAnalyticsSummary, 
  getSessionLogs, 
  getTopics,
  getStudyTime,
  getPopularTopics,
  getStudentStudyTime
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
