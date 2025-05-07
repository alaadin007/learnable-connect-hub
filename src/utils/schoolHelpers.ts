
import { supabase } from "@/integrations/supabase/client";

/**
 * Validates a school code by checking if it exists in the database
 * @param code School code to validate
 * @returns Object containing validation status and school ID if valid
 */
export const validateSchoolCode = async (code: string): Promise<{ isValid: boolean; schoolId: string | null }> => {
  try {
    // Use the get_school_by_code function which returns the school details
    const { data, error } = await supabase.rpc('get_school_by_code', { input_code: code });
    
    if (error || !data || data.length === 0) {
      console.error('School code validation error:', error);
      return { isValid: false, schoolId: null };
    }
    
    return { isValid: true, schoolId: data[0].id };
  } catch (error) {
    console.error('Error in validateSchoolCode:', error);
    return { isValid: false, schoolId: null };
  }
};

/**
 * Generate random uppercase alphanumeric school code
 * @returns String containing a random 8-character school code
 */
export const generateSchoolCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Creates a new school code in the database
 * @param code School code
 * @param schoolName School name
 * @returns Object containing success status and any error
 */
export const createSchoolCode = async (
  code: string, 
  schoolName: string
): Promise<{ success: boolean; error: any }> => {
  try {
    const { error } = await supabase
      .from("school_codes")
      .insert({
        code: code,
        school_name: schoolName,
        active: true
      });

    if (error) {
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Creates a new school in the database
 * @param code School code
 * @param name School name
 * @returns Object containing the new school data and any error
 */
export const createSchool = async (
  code: string,
  name: string
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("schools")
      .insert({
        code: code,
        name: name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
      
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};
