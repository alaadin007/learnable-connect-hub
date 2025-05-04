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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

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

    // Consider using `filters` option with email in listUsers if supported instead of manual find
    const { data: existingUserData, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers();

    if (userLookupError) {
      console.error("Error checking for existing user:", userLookupError);
      return new Response(
        JSON.stringify({ error: "Error checking existing user: " + userLookupError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const existingUser = existingUserData?.users?.find((user) => user.email === adminEmail);
    if (existingUser) {
      console.log("User already exists:", existingUser.email);
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Generate a unique school code
    const schoolCode = generateSchoolCode();

    // Create admin user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: false, // requires email confirmation
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
    const schoolId = await createSchoolRecords(
      supabaseAdmin,
      schoolCode,
      schoolName,
      userData.user.id,
      adminFullName
    );

    if (!schoolId) {
      console.error("Failed to create all school records.");
    } else {
      console.log("School records created successfully with ID:", schoolId);
    }

    // Send verification email
    const { error: verificationError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: adminEmail
    });

    if (verificationError) {
      console.error("Verification email sending failed:", verificationError);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Registered successfully but failed to send verification email.",
          userId: userData.user.id,
          schoolCode,
          email_verification_sent: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "School registered successfully. Please verify your email.",
        userId: userData.user.id,
        schoolCode,
        email_verification_sent: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
    );

  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unknown error" }),
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
    await supabase.from("school_codes").insert({
      code: schoolCode,
      school_name: schoolName,
      active: true,
    });

    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .insert({ name: schoolName, code: schoolCode })
      .select("id")
      .single();

    if (schoolError || !schoolData) {
      console.error("Error creating school record:", schoolError);
      return null;
    }

    await supabase.from("teachers").insert({
      id: userId,
      school_id: schoolData.id,
      is_supervisor: true,
    });

    await supabase.from("profiles").insert({
      id: userId,
      full_name: adminFullName,
      user_type: "school",
      school_name: schoolName,
      school_code: schoolCode,
    });

    return schoolData.id;

  } catch (error) {
    console.error("Error creating school records:", error);
    return null;
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