
import { supabase } from "@/integrations/supabase/client";

// Populate test account with sessions directly
export const populateTestAccountWithSessionsDirect = async (userId: string, schoolId: string, numSessions = 5): Promise<{
  success: boolean;
  message?: string;
  data?: any;
}> => {
  try {
    // Skip calls for non-test users or if missing required IDs
    if (!userId || !schoolId) {
      return { success: false, message: "Missing user ID or school ID" };
    }
    
    // Detect if this is a test account
    const isTest = userId.startsWith('test-') || schoolId.startsWith('test-');
    if (!isTest) {
      // Only create test sessions for test accounts
      return { success: false, message: "Not a test account" };
    }
    
    console.log(`Creating test sessions for ${userId} in school ${schoolId}`);
    
    // Call the database function directly
    const { error } = await supabase.rpc("populatetestaccountwithsessions", {
      userid: userId,
      schoolid: schoolId,
      num_sessions: numSessions
    });
    
    if (error) {
      console.error("Error creating test sessions:", error);
      return { success: false, message: error.message };
    }
    
    console.log("Test sessions created successfully");
    return { success: true, message: "Test sessions created successfully" };
  } catch (error) {
    console.error("Error in populateTestAccountWithSessions:", error);
    return { success: false, message: "Internal error" };
  }
};
