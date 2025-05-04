
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterSchoolRequest {
  schoolName: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
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
    let requestBody: RegisterSchoolRequest;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate required fields
    const { schoolName, adminEmail, adminPassword, adminFullName } = requestBody;
    if (!schoolName || !adminEmail || !adminPassword || !adminFullName) {
      console.log("Missing required fields:", { 
        hasSchoolName: !!schoolName, 
        hasAdminEmail: !!adminEmail, 
        hasAdminPassword: !!adminPassword, 
        hasAdminFullName: !!adminFullName 
      });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if user with this email already exists
    console.log("Checking if user already exists:", adminEmail);
    const { data: existingUsers, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers({
      filter: {
        email: adminEmail
      }
    });
    
    if (userLookupError) {
      console.error("Error checking for existing user:", userLookupError);
      return new Response(
        JSON.stringify({ error: "Error checking existing user: " + userLookupError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Check if user already exists using the filter results
    if (existingUsers && existingUsers.users.length > 0) {
      console.log("User already exists:", adminEmail);
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Generate a unique school code
    const schoolCode = generateSchoolCode();
    console.log(`Generated school code: ${schoolCode} for school: ${schoolName}`);

    // Create admin user
    console.log("Creating admin user:", adminEmail);
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Set to true to avoid email verification issues during testing
      user_metadata: {
        full_name: adminFullName,
        school_name: schoolName,
        school_code: schoolCode,
        user_type: "school",
      }
    });

    if (userError) {
      console.error("Error creating admin user:", userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("User created successfully:", userData.user.id);

    // Create school and related records
    try {
      console.log("Creating school records...");
      const schoolId = await createSchoolRecords(
        supabaseAdmin,
        schoolCode,
        schoolName,
        userData.user.id,
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
    } catch (error) {
      console.error("Error in createSchoolRecords:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create school records: " + error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Success response
    console.log("School registration successful for:", adminEmail);
    return new Response(
      JSON.stringify({
        success: true,
        message: "School registered successfully.",
        userId: userData.user.id,
        schoolCode,
        email_verification_sent: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
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

function generateSchoolCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
