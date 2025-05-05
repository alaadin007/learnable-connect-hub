
import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures that the necessary data for test accounts exists in the database
 */
export const ensureTestAccountsSetup = async () => {
  try {
    // Create basic test school
    const schoolId = "test-school-0";
    const schoolCode = "TEST0";
    const schoolName = "Test School";
    
    // Check if test school already exists
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('id')
      .eq('id', schoolId)
      .maybeSingle();
      
    if (!existingSchool) {
      // Create school code first
      await supabase.from('school_codes')
        .upsert({
          code: schoolCode,
          school_name: schoolName,
          active: true
        });
      
      // Create the school
      await supabase.from('schools')
        .insert({
          id: schoolId,
          name: schoolName,
          code: schoolCode
        });
        
      console.log("Created test school");
    }
    
    // Set up test accounts for each role
    const accountTypes = ["school", "teacher", "student"];
    
    for (const accountType of accountTypes) {
      const userId = `test-${accountType}-0`;
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
        
      if (!existingProfile) {
        // Create profile
        await supabase.from('profiles')
          .insert({
            id: userId,
            user_type: accountType,
            full_name: `Test ${accountType.charAt(0).toUpperCase()}${accountType.slice(1)}`,
            school_code: schoolCode,
            school_name: schoolName
          });
          
        console.log(`Created test ${accountType} profile`);
      }
      
      if (accountType === 'school' || accountType === 'teacher') {
        // Check if teacher exists
        const { data: existingTeacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
          
        if (!existingTeacher) {
          // Create teacher with appropriate supervisor status
          await supabase.from('teachers')
            .insert({
              id: userId,
              school_id: schoolId,
              is_supervisor: accountType === 'school'
            });
            
          console.log(`Created test ${accountType} teacher record`);
        }
      }
      
      if (accountType === 'student') {
        // Check if student exists
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
          
        if (!existingStudent) {
          // Create student
          await supabase.from('students')
            .insert({
              id: userId,
              school_id: schoolId
            });
            
          console.log("Created test student record");
        }
        
        // Check for API key
        const { data: existingApiKey } = await supabase
          .from('user_api_keys')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (!existingApiKey) {
          // Create API key
          await supabase.from('user_api_keys')
            .insert({
              user_id: userId,
              provider: 'openai',
              api_key: 'sk-test-key-for-development-purposes-only'
            });
            
          console.log("Created test API key");
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error setting up test accounts:", error);
    return { success: false, error };
  }
};

/**
 * Generate test session data for a student
 */
export const generateTestSessionData = async (studentId: string, schoolId: string, numSessions: number = 5) => {
  try {
    const { error } = await supabase.rpc('populatetestaccountwithsessions', {
      userid: studentId,
      schoolid: schoolId,
      num_sessions: numSessions
    });
    
    if (error) {
      console.error("Error generating test sessions:", error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error generating test sessions:", error);
    return { success: false, error };
  }
};
