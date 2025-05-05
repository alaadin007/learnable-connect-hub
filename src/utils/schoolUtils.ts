
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
