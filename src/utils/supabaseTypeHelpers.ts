
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Helper function to properly type Supabase profile inserts
 */
export const insertProfile = async (profileData: {
  id?: string;
  user_type: "student" | "teacher" | "school_admin";
  full_name: string;
  email?: string;
  school_id?: string;
  school_code?: string;
  school_name?: string;
  is_active?: boolean;
}) => {
  return await supabase
    .from('profiles')
    .upsert(profileData);
};

/**
 * Helper function to properly type Supabase student inserts
 */
export const insertStudent = async (studentData: {
  id: string;
  school_id: string;
  status?: string;
}) => {
  return await supabase
    .from('students')
    .insert(studentData);
};

/**
 * Helper function to properly type Supabase teacher inserts
 */
export const insertTeacher = async (teacherData: {
  id: string;
  school_id: string;
  is_supervisor?: boolean;
}) => {
  return await supabase
    .from('teachers')
    .insert(teacherData);
};

/**
 * Helper function to properly type Supabase school inserts
 * Returns data safely typed with explicit error checking
 */
export const insertSchool = async (schoolData: {
  name: string;
  code: string;
  contact_email?: string;
  description?: string;
}) => {
  const response = await supabase
    .from('schools')
    .insert(schoolData)
    .select();
  
  if (response.error) {
    return { data: null, error: response.error };
  }
  
  return { data: response.data?.[0] || null, error: null };
};

/**
 * Helper function to properly type Supabase school code inserts
 */
export const insertSchoolCode = async (codeData: {
  code: string;
  school_name: string;
  school_id?: string;
  active?: boolean;
}) => {
  return await supabase
    .from('school_codes')
    .insert(codeData);
};

/**
 * Type definition for user types
 */
export type UserType = "student" | "teacher" | "school_admin";

/**
 * Helper function to verify a school code
 */
export const verifySchoolCodeTyped = async (code: string) => {
  const { data, error } = await supabase
    .rpc('verify_and_link_school_code', { code });
  
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return { valid: false, schoolId: undefined, schoolName: undefined };
  }
  
  return {
    valid: data[0]?.valid || false,
    schoolId: data[0]?.school_id,
    schoolName: data[0]?.school_name
  };
};

/**
 * Helper function for inserting documents
 * Returns data safely with proper typing
 */
export const insertDocument = async (docData: {
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  processing_status?: string;
  school_id?: string | null;
}) => {
  const response = await supabase
    .from('documents')
    .insert(docData)
    .select()
    .single();
    
  if (response.error) {
    return { data: null, error: response.error };
  }
  
  return { data: response.data, error: null };
};

/**
 * Helper function for inserting student invites
 */
export const insertStudentInvite = async (inviteData: {
  school_id: string;
  code?: string;
  email?: string;
  status?: string;
  expires_at?: string;
}) => {
  return await supabase
    .from('student_invites')
    .insert(inviteData);
};

/**
 * Helper function to update student status
 */
export const updateStudentStatus = async (studentId: string, status: string) => {
  return await supabase
    .from('students')
    .update({ status })
    .eq('id', studentId);
};

/**
 * Safe type assertion helper for Supabase data
 * @param data Response data which may contain errors
 * @param fallback Default fallback if data is error or undefined
 */
export function safeDataAccess<T, F>(data: any, fallback: F): T | F {
  if (data === null || data === undefined) return fallback;
  if (typeof data === 'object' && 'error' in data) return fallback;
  return data as T;
}

/**
 * Helper function to safely get document content
 */
export const getDocumentContent = async (documentId: string) => {
  const { data, error } = await supabase
    .from('document_content')
    .select('content')
    .eq('document_id', documentId);
    
  if (error || !data || data.length === 0) {
    return null;
  }
  
  return data[0]?.content;
};

/**
 * Type guard to check if a Supabase response contains data
 */
export function hasData<T>(response: { data: T | null; error: any }): response is { data: T; error: null } {
  return !!response.data && !response.error;
}

/**
 * Type guard to check if a Supabase response contains an error
 */
export function hasError(response: { data: any; error: any }): response is { data: null; error: any } {
  return !!response.error;
}
