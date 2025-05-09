
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PostgrestError } from "@supabase/supabase-js";

/**
 * Type for Supabase response with data and error handling
 */
export type SafeResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
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

/**
 * Type guard for checking if a value is not null or undefined
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type definition for user types
 */
export type UserType = "student" | "teacher" | "school_admin";

/**
 * Helper function for safe type casting
 */
export function safeCast<T>(value: any): T {
  return value as T;
}

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
 * Helper function to properly type Supabase profile inserts
 */
export const insertProfile = async (profileData: {
  id?: string;
  user_type: UserType;
  full_name: string;
  email?: string;
  school_id?: string;
  school_code?: string;
  school_name?: string;
  is_active?: boolean;
}): Promise<SafeResponse<Database["public"]["Tables"]["profiles"]["Row"]>> => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profileData)
    .select();
  
  return { 
    data: data?.[0] || null, 
    error 
  };
};

/**
 * Helper function to properly type Supabase student inserts
 */
export const insertStudent = async (studentData: {
  id: string;
  school_id: string;
  status?: string;
}): Promise<SafeResponse<Database["public"]["Tables"]["students"]["Row"]>> => {
  const { data, error } = await supabase
    .from('students')
    .insert(studentData)
    .select();
  
  return { 
    data: data?.[0] || null, 
    error 
  };
};

/**
 * Helper function to properly type Supabase teacher inserts
 */
export const insertTeacher = async (teacherData: {
  id: string;
  school_id: string;
  is_supervisor?: boolean;
}): Promise<SafeResponse<Database["public"]["Tables"]["teachers"]["Row"]>> => {
  const { data, error } = await supabase
    .from('teachers')
    .insert(teacherData)
    .select();
  
  return { 
    data: data?.[0] || null, 
    error 
  };
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
}): Promise<SafeResponse<Database["public"]["Tables"]["schools"]["Row"]>> => {
  const { data, error } = await supabase
    .from('schools')
    .insert(schoolData)
    .select();
  
  return { 
    data: data?.[0] || null, 
    error 
  };
};

/**
 * Helper function to properly type Supabase school code inserts
 */
export const insertSchoolCode = async (codeData: {
  code: string;
  school_name: string;
  school_id?: string;
  active?: boolean;
}): Promise<SafeResponse<Database["public"]["Tables"]["school_codes"]["Row"]>> => {
  const { data, error } = await supabase
    .from('school_codes')
    .insert(codeData)
    .select();
  
  return { 
    data: data?.[0] || null, 
    error 
  };
};

/**
 * Helper function to verify a school code
 */
export const verifySchoolCode = async (code: string): Promise<{
  valid: boolean;
  schoolId?: string;
  schoolName?: string;
}> => {
  // We need to cast the string parameter explicitly
  const { data, error } = await supabase
    .rpc('verify_and_link_school_code', { 
      code: code as unknown as Database["public"]["Functions"]["verify_and_link_school_code"]["Args"]["code"]
    });
  
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
}): Promise<SafeResponse<Database["public"]["Tables"]["documents"]["Row"]>> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert(safeCast<Database["public"]["Tables"]["documents"]["Insert"]>(docData))
      .select()
      .single();
    
    return { data: data || null, error };
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
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
}): Promise<SafeResponse<Database["public"]["Tables"]["student_invites"]["Row"]>> => {
  try {
    const { data, error } = await supabase
      .from('student_invites')
      .insert(safeCast<Database["public"]["Tables"]["student_invites"]["Insert"]>(inviteData))
      .select();
    
    return { data: data?.[0] || null, error };
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};

/**
 * Helper function to update student status
 */
export const updateStudentStatus = async (studentId: string, status: string): Promise<SafeResponse<null>> => {
  try {
    const { error } = await supabase
      .from('students')
      .update(safeCast<Database["public"]["Tables"]["students"]["Update"]>({ status }))
      .eq('id', studentId as any);
    
    return { data: null, error };
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};

/**
 * Helper function to safely get document content
 */
export const getDocumentContent = async (documentId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('document_content')
      .select('content')
      .eq('document_id', documentId as any)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data.content || null;
  } catch (error) {
    console.error("Error getting document content:", error);
    return null;
  }
};

/**
 * Helper function to safely query documents for a user
 */
export const getUserDocuments = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId as any)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};

/**
 * Helper function to safely delete document content
 */
export const deleteDocumentContent = async (documentId: string) => {
  try {
    return await supabase
      .from('document_content')
      .delete()
      .eq('document_id', documentId as any);
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};

/**
 * Helper function to safely delete a document
 */
export const deleteDocument = async (documentId: string) => {
  try {
    return await supabase
      .from('documents')
      .delete()
      .eq('id', documentId as any);
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};

/**
 * Helper function to get students for a school
 */
export const getStudentsForSchool = async (schoolId: string) => {
  try {
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', schoolId as any);

    if (studentError || !studentData || studentData.length === 0) {
      return { data: [], error: studentError };
    }

    // Get profile data for these students
    const studentIds = studentData.map(s => s.id);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .in('id', studentIds as any[]);

    return { data: profileData, error: profileError };
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};

/**
 * Helper function to get student invites for a school
 */
export const getStudentInvitesForSchool = async (schoolId: string) => {
  try {
    const { data, error } = await supabase
      .from('student_invites')
      .select('*')
      .eq('school_id', schoolId as any);
    
    return { data, error };
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};

/**
 * Helper function to get user API keys
 */
export const getUserApiKeys = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', userId as any);
    
    return { data, error };
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};

/**
 * Helper function to insert or update user API key
 */
export const upsertUserApiKey = async (data: {
  user_id: string;
  provider: string;
  api_key: string;
}) => {
  try {
    return await supabase
      .from('user_api_keys')
      .upsert(safeCast(data))
      .select();
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};

/**
 * Helper function to safely get a user's profile
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId as any)
      .single();
    
    return { data, error };
  } catch (err) {
    return { data: null, error: err as PostgrestError };
  }
};
