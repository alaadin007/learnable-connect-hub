
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteRegistrationRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Parse request body
    let requestBody: CompleteRegistrationRequest;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { userId } = requestBody;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Complete Registration - Processing user ID:", userId);

    // Get user details
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData || !userData.user) {
      console.error("Error getting user details:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const user = userData.user;
    console.log("User found:", user.id, "Email:", user.email);
    
    // Check if email is verified
    if (!user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ error: "Email not verified. Please verify your email first." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Email verified at:", user.email_confirmed_at);

    // Check if registration is already completed
    if (user.user_metadata?.registration_complete === true) {
      console.log("Registration already completed for user:", userId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Registration already completed." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Extract metadata
    const schoolName = user.user_metadata?.school_name;
    const schoolCode = user.user_metadata?.school_code;
    const adminFullName = user.user_metadata?.full_name;
    
    if (!schoolName || !schoolCode || !adminFullName) {
      console.error("Missing user metadata for user:", userId, "Metadata:", user.user_metadata);
      return new Response(
        JSON.stringify({ error: "Missing user metadata" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("School info:", schoolName, schoolCode, "Admin:", adminFullName);

    // Create school records now that the user is verified
    try {
      console.log("Creating school records for verified user:", userId);
      const schoolId = await createSchoolRecords(
        supabaseAdmin,
        schoolCode,
        schoolName,
        userId,
        adminFullName
      );

      if (!schoolId) {
        console.error("Failed to create all school records.");
        return new Response(
          JSON.stringify({ error: "Failed to create school records" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      console.log("School records created successfully with ID:", schoolId);
      
      // Update user metadata to indicate registration is complete
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          registration_complete: true
        }
      });
      
      console.log("User metadata updated to mark registration as complete");
      
    } catch (error) {
      console.error("Error in createSchoolRecords:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create school records: " + error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Registration completed successfully."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ 
        error: error?.message ?? "Unknown error",
        stack: error?.stack ?? "No stack trace available"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function createSchoolRecords(
  supabase: any,
  schoolCode: string,
  schoolName: string,
  userId: string,
  adminFullName: string,
): Promise<string | null> {
  try {
    console.log("Creating school_codes entry for:", schoolCode, schoolName);
    const { error: codeError } = await supabase
      .from("school_codes")
      .insert({
        code: schoolCode,
        school_name: schoolName,
        active: true,
      });

    if (codeError) {
      console.error("Error inserting school code:", codeError);
      throw codeError;
    }

    console.log("Creating school entry for:", schoolName, schoolCode);
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .insert({ name: schoolName, code: schoolCode })
      .select("id")
      .single();

    if (schoolError) {
      console.error("Error creating school record:", schoolError);
      throw schoolError;
    }

    if (!schoolData) {
      console.error("No school data returned from insert");
      throw new Error("Failed to get school ID after insert");
    }

    console.log("Creating teacher entry for admin:", userId, schoolData.id);
    const { error: teacherError } = await supabase
      .from("teachers")
      .insert({
        id: userId,
        school_id: schoolData.id,
        is_supervisor: true,
      });

    if (teacherError) {
      console.error("Error creating teacher record:", teacherError);
      throw teacherError;
    }

    console.log("Creating profile entry for:", userId, adminFullName);
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name: adminFullName,
        user_type: "school",
        school_name: schoolName,
        school_code: schoolCode,
      });

    if (profileError) {
      console.error("Error creating profile record:", profileError);
      throw profileError;
    }

    return schoolData.id;
  } catch (error) {
    console.error("Error in createSchoolRecords:", error);
    throw error;
  }
}
