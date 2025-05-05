
import { supabase } from "@/integrations/supabase/client";

/**
 * Get the current user's school ID
 */
export const getCurrentUserSchoolId = async () => {
  try {
    const { data, error } = await supabase.rpc('get_user_school_id');
    
    if (error) {
      console.error("Error getting user school ID:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error getting user school ID:", error);
    return null;
  }
};

/**
 * Generate an invitation code for a student
 */
export const generateStudentInviteCode = async () => {
  try {
    if (!supabase) {
      return { code: null, error: "Supabase client not initialized" };
    }
    
    const { data, error } = await supabase.rpc('create_student_invitation');
    
    if (error) {
      console.error("Error generating student invite code:", error);
      return { code: null, error: error.message };
    }
    
    return { code: data[0].code, error: null };
  } catch (error: any) {
    console.error("Error generating student invite code:", error);
    return { code: null, error: error.message || "An unknown error occurred" };
  }
};

/**
 * Get information about the current school
 */
export const getCurrentSchoolInfo = async () => {
  try {
    const { data, error } = await supabase.rpc('get_current_school_info');
    
    if (error) {
      console.error("Error getting current school info:", error);
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error("Error getting current school info:", error);
    return null;
  }
};

/**
 * Get all student invites for the current school
 */
export const getStudentInvites = async () => {
  try {
    // Get the school ID first
    const schoolId = await getCurrentUserSchoolId();
    
    if (!schoolId) {
      return { data: null, error: "Could not determine school ID" };
    }
    
    // Now fetch the invites
    const { data, error } = await supabase
      .from('student_invites')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching student invites:", error);
      return { data: null, error: error.message };
    }
    
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching student invites:", error);
    return { data: null, error: error.message || "Error fetching student invites" };
  }
};

/**
 * Generate a new school code
 */
export const generateNewSchoolCode = async () => {
  // This is a placeholder, as we would typically use a database function for this
  // We'll implement this when needed
  return { code: null, error: "Not implemented yet" };
};

// Ensure the getSchoolInfoByCode function exists
// Only add this if it's not already in the file

/**
 * Get school information by code
 */
export const getSchoolInfoByCode = async (schoolCode: string) => {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("code", schoolCode)
      .single();
      
    if (error) {
      console.error("Error fetching school info by code:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error getting school info by code:", error);
    return null;
  }
};
