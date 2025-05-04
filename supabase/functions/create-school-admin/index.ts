
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateSchoolAdminRequest {
  email: string;
  password: string;
  fullName: string;
  schoolId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Create school admin function called");
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const { email, password, fullName, schoolId } = requestBody as CreateSchoolAdminRequest;

    // Validate required fields
    if (!email || !password || !fullName || !schoolId) {
      console.log("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get school information
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from('schools')
      .select('name, code')
      .eq('id', schoolId)
      .single();

    if (schoolError || !schoolData) {
      console.error("Error retrieving school:", schoolError);
      return new Response(
        JSON.stringify({ error: "Invalid school ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Creating admin for school: ${schoolData.name} with email: ${email}`);
    
    // Check if user already exists by email
    const { data: existingUserData, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers({
      filter: {
        email: email,
      },
    });
    
    if (userLookupError) {
      console.error("Error checking for existing user:", userLookupError);
      return new Response(
        JSON.stringify({ error: "Error checking for existing user: " + userLookupError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (existingUserData && existingUserData.users && existingUserData.users.length > 0) {
      console.log("User already exists:", existingUserData.users[0].email);
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Create the user with appropriate metadata
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // Set to false to send email confirmation
      user_metadata: {
        full_name: fullName,
        school_name: schoolData.name,
        school_code: schoolData.code,
        user_type: "school" // Mark as school admin
      }
    });

    if (userError) {
      console.error("Error creating admin user:", userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // After successful creation, send email verification separately
    const { data: linkData, error: verificationError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
    });

    if (verificationError) {
      console.error("Error sending verification email:", verificationError);
      // Still return success but note the verification issue
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "School admin created successfully, but there was an issue sending the verification email.",
          userId: userData.user.id,
          email_verification_sent: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
      );
    }

    // Create or update teacher record for the admin
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .upsert({
        id: userData.user.id,
        school_id: schoolId,
        is_supervisor: true, // Mark as supervisor (admin)
      });

    if (teacherError) {
      console.error("Error updating teacher record:", teacherError);
      // Already created user, so return success with warning
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "School admin created but there was an issue setting up admin permissions.",
          userId: userData.user.id,
          warning: "Admin permissions may need to be set up manually."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
      );
    }

    console.log(`School admin created successfully. User ID: ${userData.user.id}, verification email sent`);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "School admin created successfully. Verification email has been sent.",
        userId: userData.user.id,
        email_verification_sent: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
    );
  } catch (error) {
    console.error("Error in create-school-admin function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred: " + (error instanceof Error ? error.message : String(error)) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
