
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
 */
export const insertSchool = async (schoolData: {
  name: string;
  code: string;
  contact_email?: string;
  description?: string;
}) => {
  return await supabase
    .from('schools')
    .insert(schoolData)
    .select();
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
export type UserType = "student" | "teacher" | "school_admin" | "school";

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
