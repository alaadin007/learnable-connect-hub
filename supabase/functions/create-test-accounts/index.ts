
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestAccountRequest {
  type: "school" | "teacher" | "student";
  schoolIndex?: number;
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
    const { type, schoolIndex = 0 } = await req.json() as TestAccountRequest;

    if (!type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Generate stable test account data
    const email = `${type}.test${schoolIndex}@learnable.edu`;
    const password = "test123456"; // Simple password for test accounts
    const fullName = `Test ${type.charAt(0).toUpperCase()}${type.slice(1)}${schoolIndex > 0 ? ' ' + schoolIndex : ''}`;
    const schoolName = schoolIndex > 0 ? `Test School ${schoolIndex}` : "Test School";
    const schoolCode = `TEST${schoolIndex}`;

    console.log(`Creating test ${type} account: ${email}`);
    
    // Check if the user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (existingUser) {
      console.log(`Test account ${email} already exists, returning existing user`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test account already exists",
          email,
          password,
          type,
          userId: existingUser.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // For school type, check if we need to create a school code first
    if (type === 'school') {
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
    }
    
    // Create the user with appropriate metadata
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
      return new Response(
        JSON.stringify({ error: userError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Test account created successfully. User ID: ${userData.user.id}`);
    
    // For teacher or student type and school exists, populate some test data
    if ((type === 'teacher' || type === 'student') && schoolIndex >= 0) {
      try {
        // Call the populate test data function if needed
        const { data: schoolData } = await supabaseAdmin.from('schools')
          .select('id')
          .eq('code', schoolCode)
          .maybeSingle();
          
        if (schoolData?.id) {
          console.log(`Found school with ID ${schoolData.id} for test account`);
          
          // Additional setup can be done here if needed
        }
      } catch (setupError) {
        console.error("Error in test data setup:", setupError);
        // Continue anyway as this is non-critical
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Test account created successfully",
        email,
        password,
        type,
        userId: userData.user.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
    );
  } catch (error) {
    console.error("Error in create-test-accounts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
