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
    
    // Convert string expiry date to number for comparison (if present)
    const expiryDate = data.expires_at ? new Date(data.expires_at).getTime() : 0;
    const now = new Date().getTime();
    
    if (expiryDate && expiryDate < now) {
      return { valid: false, message: "School code has expired" };
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
