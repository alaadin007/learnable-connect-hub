
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
    
    console.log("Setting up test account infrastructure...");
    
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
    console.log(`Generating ${numSessions} test sessions for student ${studentId} at school ${schoolId}`);
    
    try {
      const { error } = await supabase.rpc('populatetestaccountwithsessions', {
        userid: studentId,
        schoolid: schoolId,
        num_sessions: numSessions
      });
      
      if (error) {
        console.error("Error generating test sessions via RPC:", error);
        // Fall back to direct generation
        return await generateTestSessionsDirectly(studentId, schoolId, numSessions);
      }
      
      return { success: true };
    } catch (rpcError) {
      console.error("RPC call failed, using fallback:", rpcError);
      return await generateTestSessionsDirectly(studentId, schoolId, numSessions);
    }
  } catch (error) {
    console.error("Error generating test sessions:", error);
    return { success: false, error };
  }
};

/**
 * Generate test session data directly without using the RPC function
 * Used as fallback when RPC fails
 */
const generateTestSessionsDirectly = async (studentId: string, schoolId: string, numSessions: number = 5) => {
  try {
    console.log("Using direct database insertion for test sessions");
    
    const topics = ['Algebra equations', 'World War II', 'Chemical reactions', 'Shakespeare\'s Macbeth', 'Programming basics'];
    
    // Generate test sessions
    for (let i = 0; i < numSessions; i++) {
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const sessionStart = new Date();
      sessionStart.setDate(sessionStart.getDate() - (i + 1)); // 1-5 days ago
      
      const sessionEnd = new Date(sessionStart);
      sessionEnd.setMinutes(sessionEnd.getMinutes() + Math.floor(Math.random() * 120)); // Add 0-120 minutes
      
      // Create session log
      const { data: sessionLog, error: sessionError } = await supabase.from('session_logs')
        .insert({
          user_id: studentId,
          school_id: schoolId,
          topic_or_content_used: randomTopic,
          session_start: sessionStart.toISOString(),
          session_end: sessionEnd.toISOString(),
          num_queries: Math.floor(Math.random() * 10 + 5)
        })
        .select();
        
      if (sessionError) {
        console.error(`Error creating session ${i+1}:`, sessionError);
      } else {
        console.log(`Created test session ${i+1} with topic ${randomTopic}`);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error generating test sessions directly:", error);
    return { success: false, error };
  }
};

/**
 * Ensure the test account data matches across all tables
 */
export const validateAndFixTestAccount = async (userId: string, accountType: string) => {
  try {
    console.log(`Validating and fixing test account: ${accountType} (${userId})`);
    
    const schoolId = "test-school-0";
    const schoolCode = "TEST0";
    const schoolName = "Test School";
    
    // Fix profile data
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: userId,
        user_type: accountType,
        full_name: `Test ${accountType.charAt(0).toUpperCase()}${accountType.slice(1)}`,
        school_code: schoolCode,
        school_name: schoolName
      });
      console.log(`Created missing profile for ${accountType}`);
    } else if (
      existingProfile.user_type !== accountType || 
      existingProfile.school_code !== schoolCode || 
      existingProfile.school_name !== schoolName
    ) {
      await supabase.from('profiles').update({
        user_type: accountType,
        school_code: schoolCode,
        school_name: schoolName
      }).eq('id', userId);
      console.log(`Updated profile data for ${accountType}`);
    }
    
    // Fix role-specific data
    if (accountType === 'school' || accountType === 'teacher') {
      const { data: existingTeacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (!existingTeacher) {
        await supabase.from('teachers').insert({
          id: userId,
          school_id: schoolId,
          is_supervisor: accountType === 'school'
        });
        console.log(`Created missing teacher record for ${accountType}`);
      } else if (
        existingTeacher.school_id !== schoolId || 
        existingTeacher.is_supervisor !== (accountType === 'school')
      ) {
        await supabase.from('teachers').update({
          school_id: schoolId,
          is_supervisor: accountType === 'school'
        }).eq('id', userId);
        console.log(`Updated teacher data for ${accountType}`);
      }
    }
    
    if (accountType === 'student') {
      const { data: existingStudent } = await supabase
        .from('students')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (!existingStudent) {
        await supabase.from('students').insert({
          id: userId,
          school_id: schoolId
        });
        console.log("Created missing student record");
      } else if (existingStudent.school_id !== schoolId) {
        await supabase.from('students').update({
          school_id: schoolId
        }).eq('id', userId);
        console.log("Updated student data");
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error fixing test account:", error);
    return { success: false, error };
  }
};
