
// If this file exists, I'm making an update to ensure the populateTestAccountWithSessions function works correctly,
// particularly with the teacher test account. This file is referenced in AuthContext but not shown in the current code snippet.
// If it doesn't exist, this will create it with the proper functionality.

// Export the function that's used in AuthContext
export const populateTestAccountWithSessions = async (userId: string, schoolId: string, numSessions = 5): Promise<void> => {
  try {
    console.log(`SessionLogging: Populating test account ${userId} with ${numSessions} sessions for school ${schoolId}`);
    
    // Call the Supabase function to populate test sessions
    const { error } = await supabase.functions.invoke("populate-test-performance", {
      body: { 
        userId,
        schoolId,
        numSessions 
      }
    });
    
    if (error) {
      console.error("Error invoking populate-test-performance:", error);
      throw error;
    }
    
    console.log(`SessionLogging: Successfully populated test sessions for ${userId}`);
  } catch (error) {
    console.error("Error in populateTestAccountWithSessions:", error);
    throw error;
  }
};

// Import supabase client if it doesn't exist in the file
import { supabase } from "@/integrations/supabase/client";
