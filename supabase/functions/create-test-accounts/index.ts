
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
    // First check if we're in development mode - if so, we'll skip most DB operations
    // and just return mock data for testing purposes
    const isDev = Deno.env.get("SUPABASE_URL")?.includes("localhost") || 
                  Deno.env.get("DENO_ENV") === "development" ||
                  Deno.env.get("NODE_ENV") === "development";
    
    if (isDev) {
      console.log("Development environment detected - returning mock data");
      return { 
        email,
        password,
        type,
        userId,
        schoolId: `test-school-${schoolIndex || 0}`,
        schoolCode,
        schoolName,
        fullName,
        exists: false
      };
    }
    
    // For school type, check if we need to create a school code first
    let schoolId = `test-school-${schoolIndex || 0}`;
    
    try {
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
    } catch (err) {
      console.log("Error checking/creating school code - continuing anyway:", err);
      // Continue anyway as this is non-critical
    }
    
    try {
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
          // Continue anyway with the stable schoolId
          console.log("Using stable schoolId instead:", schoolId);
        } else if (newSchool) {
          schoolId = newSchool.id;
        }
      }
    } catch (err) {
      console.log("Error checking/creating school - continuing anyway:", err);
      // Continue anyway as this is non-critical
    }
    
    try {
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
    } catch (err) {
      console.log("Error checking/creating profile - continuing anyway:", err);
      // Continue anyway as this is non-critical
    }
      
    // For teacher or student, set up role-specific data
    if (type === 'teacher') {
      try {
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
      } catch (err) {
        console.log("Error checking/creating teacher - continuing anyway:", err);
        // Continue anyway as this is non-critical
      }
    } else if (type === 'student') {
      try {
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
      } catch (err) {
        console.log("Error checking/creating student - continuing anyway:", err);
        // Continue anyway as this is non-critical
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
      try {
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
      } catch (err) {
        console.log("Error checking/creating school admin - continuing anyway:", err);
        // Continue anyway as this is non-critical
      }
    }

    // Create API keys for test accounts (like OpenAI)
    try {
      // Check if test API key exists
      const { data: existingApiKey } = await supabaseAdmin.from('user_api_keys')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'openai')
        .maybeSingle();
        
      if (!existingApiKey) {
        // Insert test API key
        await supabaseAdmin.from('user_api_keys')
          .insert({
            user_id: userId,
            provider: 'openai',
            api_key: 'sk-test-key-for-development-purposes-only'
          });
        console.log(`Created test API key for user ${userId}`);
      }
    } catch (apiKeyError) {
      console.error("Error creating test API key:", apiKeyError);
      // Continue anyway as this is non-critical
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
