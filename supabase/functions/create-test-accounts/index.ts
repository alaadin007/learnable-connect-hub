
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestAccountRequest {
  type?: "school" | "teacher" | "student";
  schoolIndex?: number;
  refresh?: boolean;
  types?: ("school" | "teacher" | "student")[]; 
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const { type, schoolIndex = 0, refresh = false, types = [] } = await req.json() as TestAccountRequest;

    // If refresh is true, handle bulk refresh of accounts
    if (refresh) {
      console.log("Refreshing all test accounts");
      
      const accountTypes = types.length > 0 ? types : ["school", "teacher", "student"];
      const accountResults = [];
      
      for (const accountType of accountTypes) {
        try {
          const result = await createOrUpdateTestAccount(supabaseAdmin, accountType, schoolIndex);
          accountResults.push(result);
          console.log(`Refreshed ${accountType} account:`, result.email);
        } catch (err) {
          console.error(`Error refreshing ${accountType} account:`, err);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test accounts refreshed",
          accounts: accountResults
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Handle single account request for instant login
    if (!type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const accountResult = await createOrUpdateTestAccount(supabaseAdmin, type, schoolIndex);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: accountResult.exists ? "Test account ready for instant login" : "Test account created for instant login",
        ...accountResult
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: accountResult.exists ? 200 : 201 
      }
    );
  } catch (error) {
    console.error("Error in create-test-accounts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function createOrUpdateTestAccount(
  supabaseAdmin: any,
  type: "school" | "teacher" | "student",
  schoolIndex = 0
) {
  // Generate stable test account data
  const email = `${type}.test${schoolIndex > 0 ? schoolIndex : ''}@learnable.edu`;
  const password = "test123456"; // Simple password for test accounts
  const fullName = `Test ${type.charAt(0).toUpperCase()}${type.slice(1)}${schoolIndex > 0 ? ' ' + schoolIndex : ''}`;
  const schoolName = schoolIndex > 0 ? `Test School ${schoolIndex}` : "Test School";
  const schoolCode = `TEST${schoolIndex}`;

  console.log(`Creating/checking test ${type} account: ${email}`);
  
  // Generate a stable user ID for test accounts based on type and index
  const userId = `test-${type}-${schoolIndex || 0}`;
  let exists = false;
  
  try {
    // For school type, check if we need to create a school code first
    let schoolId = `test-school-${schoolIndex || 0}`;
    
    // Check if school code exists
    const { data: existingCode } = await supabaseAdmin.from('school_codes')
      .select('*')
      .eq('code', schoolCode)
      .maybeSingle();
      
    if (!existingCode) {
      // Create school code
      await supabaseAdmin.from('school_codes')
        .insert({
          code: schoolCode,
          school_name: schoolName,
          active: true
        });
        
      console.log(`Created school code: ${schoolCode} for ${schoolName}`);
    }
    
    // Check if school exists
    const { data: existingSchool } = await supabaseAdmin.from('schools')
      .select('id')
      .eq('code', schoolCode)
      .maybeSingle();
      
    if (existingSchool) {
      schoolId = existingSchool.id;
      exists = true;
    } else {
      // Create the school
      const { data: newSchool, error: schoolError } = await supabaseAdmin.from('schools')
        .insert({ 
          id: schoolId,
          name: schoolName,
          code: schoolCode
        })
        .select('id')
        .single();
        
      if (schoolError) {
        console.error("Error creating school:", schoolError);
        throw new Error(`Failed to create school: ${schoolError.message}`);
      }
      
      if (newSchool) {
        schoolId = newSchool.id;
      }
    }
    
    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin.from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (existingProfile) {
      // Update existing profile
      await supabaseAdmin.from('profiles')
        .update({
          user_type: type,
          full_name: fullName,
          school_code: schoolCode,
          school_name: schoolName
        })
        .eq('id', userId);
      
      exists = true;
    } else {
      // Create a profiles entry
      await supabaseAdmin.from('profiles')
        .insert({
          id: userId,
          user_type: type,
          full_name: fullName,
          school_code: schoolCode,
          school_name: schoolName
        });
    }
      
    // For teacher or student, set up role-specific data
    if (type === 'teacher') {
      const { data: teacherCheck } = await supabaseAdmin.from('teachers')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
          
      if (!teacherCheck) {
        await supabaseAdmin.from('teachers')
          .insert({
            id: userId,
            school_id: schoolId,
            is_supervisor: false
          });
      }
    } else if (type === 'student') {
      const { data: studentCheck } = await supabaseAdmin.from('students')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
          
      if (!studentCheck) {
        await supabaseAdmin.from('students')
          .insert({
            id: userId,
            school_id: schoolId
          });
      }
      
      // Generate test session data
      try {
        await supabaseAdmin.rpc('populatetestaccountwithsessions', {
          userid: userId,
          schoolid: schoolId,
          num_sessions: 5
        });
        console.log(`Generated test session data for student ${userId}`);
      } catch (sessionError) {
        console.error("Error generating test sessions:", sessionError);
        // Continue anyway as this is non-critical
      }
    } else if (type === 'school') {
      // For school admin, make sure they're set up as a supervisor teacher
      const { data: teacherCheck } = await supabaseAdmin.from('teachers')
        .select('id, is_supervisor')
        .eq('id', userId)
        .maybeSingle();
      
      if (!teacherCheck) {
        await supabaseAdmin.from('teachers')
          .insert({
            id: userId,
            school_id: schoolId,
            is_supervisor: true
          });
      } else if (!teacherCheck.is_supervisor) {
        await supabaseAdmin.from('teachers')
          .update({ is_supervisor: true })
          .eq('id', userId);
      }
    }

    // Return account details for instant login
    return { 
      email,
      password,
      type,
      userId,
      schoolId,
      schoolCode,
      schoolName,
      fullName,
      exists
    };
  } catch (error) {
    console.error("Error in createOrUpdateTestAccount:", error);
    throw error;
  }
}
