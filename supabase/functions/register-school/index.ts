
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

    // Create admin user with email confirmation required (false to true)
    // Setting email_confirm to false so the user must verify their email
    console.log("Creating admin user with verification required:", adminEmail);
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: false, // Changed to false to require email verification
      user_metadata: {
        full_name: adminFullName,
        school_name: schoolName,
        school_code: schoolCode,
        user_type: "school",
        registration_complete: false // Add flag to track registration status
      }
    });

    if (userError) {
      console.error("Error creating admin user:", userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("User created successfully, awaiting email verification:", userData.user.id);

    // Send verification email explicitly to make sure it's sent
    const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: adminEmail,
      options: {
        redirectTo: `${new URL(req.url).origin}/login?completeRegistration=true`
      }
    });

    if (linkError) {
      console.error("Error sending verification email:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email: " + linkError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Success response
    console.log("School registration initiated for:", adminEmail);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Registration initiated. Please check your email to verify your account.",
        userId: userData.user.id,
        schoolCode,
        email_verification_sent: true,
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

function generateSchoolCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
