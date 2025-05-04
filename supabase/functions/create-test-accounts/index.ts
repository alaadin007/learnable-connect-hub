
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

    // Handle single account request
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
        message: accountResult.exists ? "Test account already exists" : "Test account created successfully",
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
  
  // Check if the user already exists
  const { data: existingUser, error: userCheckError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
  
  if (userCheckError && userCheckError.message !== "User not found") {
    throw new Error(`Error checking for existing user: ${userCheckError.message}`);
  }
  
  let userId = existingUser?.id;
  let exists = !!existingUser;
  
  // For school type, check if we need to create a school code first
  let schoolId = null;
  if (type === 'school' || type === 'teacher' || type === 'student') {
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
    
    // Get or create school id
    const { data: existingSchool } = await supabaseAdmin.from('schools')
      .select('id')
      .eq('code', schoolCode)
      .maybeSingle();
      
    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const { data: newSchool } = await supabaseAdmin.from('schools')
        .insert({ 
          name: schoolName,
          code: schoolCode
        })
        .select('id')
        .single();
        
      if (newSchool) {
        schoolId = newSchool.id;
      }
    }
  }
  
  // Create the user if it doesn't exist
  if (!existingUser) {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        school_name: schoolName,
        school_code: schoolCode,
        user_type: type
      }
    });

    if (userError) {
      console.error("Error creating test user:", userError);
      throw new Error(userError.message);
    }

    console.log(`Test account created successfully. User ID: ${userData.user.id}`);
    userId = userData.user.id;
  } else {
    // Update existing user metadata to ensure it's current
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      {
        user_metadata: {
          full_name: fullName,
          school_name: schoolName,
          school_code: schoolCode,
          user_type: type
        }
      }
    );
    
    if (updateError) {
      console.error("Error updating existing user:", updateError);
    }
  }
  
  // Make sure profile record exists and is up-to-date
  const { data: profileCheck } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
    
  if (!profileCheck) {
    await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        user_type: type,
        full_name: fullName,
        school_code: schoolCode,
        school_name: schoolName
      });
  }
  
  // For teacher or student type and school exists, populate some test data
  if ((type === 'teacher' || type === 'student') && schoolId) {
    try {
      // Check if the user is registered in the appropriate role table
      if (type === 'teacher') {
        const { data: teacherCheck } = await supabaseAdmin
          .from('teachers')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
          
        if (!teacherCheck) {
          await supabaseAdmin
            .from('teachers')
            .insert({
              id: userId,
              school_id: schoolId,
              is_supervisor: false
            });
        }
      } else if (type === 'student') {
        const { data: studentCheck } = await supabaseAdmin
          .from('students')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
          
        if (!studentCheck) {
          await supabaseAdmin
            .from('students')
            .insert({
              id: userId,
              school_id: schoolId
            });
        }
        
        // Generate some session logs for the student
        await supabaseAdmin.rpc('populatetestaccountwithsessions', {
          userid: userId,
          schoolid: schoolId,
          num_sessions: 5
        });
      }
      
      console.log(`Set up role-specific data for ${type}`);
    } catch (setupError) {
      console.error("Error in test data setup:", setupError);
      // Continue anyway as this is non-critical
    }
  }

  // Return account details
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
}
