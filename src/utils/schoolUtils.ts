
import { supabase } from "@/integrations/supabase/client";
import { getUserSchoolId } from "./userManagement";

/**
 * Get the current school info either from RPC function or direct query
 * This function handles both possible return types:
 * - From RPC: { school_id, school_name, school_code, contact_email }
 * - From direct query: The entire schools table record
 */
export const getCurrentSchoolInfo = async () => {
  try {
    // First try to get via the RPC function (preferred for real users)
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_current_school_info");
    
    if (!rpcError && rpcData && rpcData.school_id) {
      return rpcData;
    }
    
    // If RPC failed or returned no data, try direct query with cached school ID
    const schoolId = await getUserSchoolId();
    
    if (!schoolId) {
      console.error("Could not determine school ID for current user");
      return null;
    }
    
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();
    
    if (schoolError) {
      console.error("Error fetching school data:", schoolError);
      return null;
    }
    
    return schoolData;
  } catch (error) {
    console.error("Error getting current school info:", error);
    return null;
  }
};

/**
 * Get the school name from the school code
 * @param schoolCode The school code to lookup
 */
export const getSchoolNameFromCode = async (schoolCode: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('school_codes')
      .select('school_name')
      .eq('code', schoolCode)
      .single();
      
    if (error) {
      console.error("Error fetching school name:", error);
      return null;
    }
    
    return data?.school_name || null;
  } catch (error) {
    console.error("Error getting school name:", error);
    return null;
  }
};

/**
 * Check if a school code is valid and not expired
 * @param code The school code to validate
 */
export const validateSchoolCode = async (code: string) => {
  try {
    const { data, error } = await supabase
      .from("school_codes")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .single();
      
    if (error || !data) {
      return { valid: false, message: "Invalid school code" };
    }
    
    // Handle case where expires_at might not exist in some records
    if (data.expires_at) {
      const expiryDate = new Date(data.expires_at).getTime();
      const now = new Date().getTime();
      
      if (expiryDate < now) {
        return { valid: false, message: "School code has expired" };
      }
    }
    
    return {
      valid: true,
      schoolName: data.school_name,
      code: data.code
    };
  } catch (error) {
    console.error("Error validating school code:", error);
    return { valid: false, message: "Error validating school code" };
  }
};

/**
 * Get the current user's school ID
 * A convenience wrapper around getCurrentSchoolInfo that extracts just the ID
 */
export const getCurrentUserSchoolId = async (): Promise<string | null> => {
  try {
    const schoolInfo = await getCurrentSchoolInfo();
    
    if (!schoolInfo) return null;
    
    // Handle both return types from getCurrentSchoolInfo
    if ('school_id' in schoolInfo) {
      return schoolInfo.school_id;
    } else {
      return schoolInfo.id;
    }
  } catch (error) {
    console.error("Error getting current user school ID:", error);
    return null;
  }
};

/**
 * Generate a student invitation code
 * Creates a new student invitation code in the database
 */
export const generateStudentInviteCode = async () => {
  try {
    // First get the school ID
    const schoolId = await getCurrentUserSchoolId();
    
    if (!schoolId) {
      return { code: null, error: "Could not determine school ID" };
    }
    
    // Use the database function to generate a code
    const { data, error } = await supabase
      .rpc('create_student_invitation', {
        school_id_param: schoolId
      });
      
    if (error) {
      console.error("Error generating student invite code:", error);
      return { code: null, error: error.message };
    }
    
    if (!data || data.length === 0) {
      return { code: null, error: "No code returned from server" };
    }
    
    return { code: data[0].code, error: null };
  } catch (error: any) {
    console.error("Error generating student invite code:", error);
    return { code: null, error: error.message || "Unknown error" };
  }
};

/**
 * Get all student invites for the current user's school
 */
export const getStudentInvites = async () => {
  try {
    // First get the school ID
    const schoolId = await getCurrentUserSchoolId();
    
    if (!schoolId) {
      return { data: null, error: "Could not determine school ID" };
    }
    
    // Fetch all invites for this school
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
    return { data: null, error: error.message || "Unknown error" };
  }
};
