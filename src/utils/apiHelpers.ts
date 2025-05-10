
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserRole } from '@/components/auth/ProtectedRoute';

// Define UserType enum and export it
export type UserType = 'student' | 'teacher' | 'school_admin' | 'teacher_supervisor';

// Interface for profile data
export interface ProfileData {
  id: string;
  user_type: UserType;
  full_name: string;
  email?: string;
  school_id?: string;
  school_code?: string;
  school_name?: string;
  is_active?: boolean;
  is_supervisor?: boolean;
  organization?: {
    id: string;
    name?: string;
    code?: string;
  };
}

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
 * @param provider The API provider name
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

    return data as ProfileData;
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
    
    return data as ProfileData;
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

    return data as ProfileData;
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
  return userRole === 'school_admin' || userRole === 'teacher_supervisor';
}

/**
 * Get school ID with fallback
 * This function tries to get a school ID from various sources
 */
export function getSchoolIdWithFallback(): string | null {
  // Try to get from localStorage first
  const storedSchoolId = localStorage.getItem('schoolId');
  if (storedSchoolId) {
    return storedSchoolId;
  }
  
  return null;
}

