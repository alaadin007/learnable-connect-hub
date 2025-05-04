
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Register school function called");
    
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
    
    const { schoolName, adminEmail, adminPassword, adminFullName } = requestBody as RegisterSchoolRequest;

    // Validate required fields
    if (!schoolName || !adminEmail || !adminPassword || !adminFullName) {
      console.log("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Generate a unique school code
    const schoolCode = generateSchoolCode();

    console.log(`Registering school: ${schoolName} with admin: ${adminEmail}`);
    
    // Check if user already exists by directly querying auth.users
    try {
      const { data: existingUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        filter: {
          email: adminEmail,
        },
      });
      
      if (authError) {
        console.error("Error checking for existing user:", authError);
        return new Response(
          JSON.stringify({ error: "Error checking for existing user: " + authError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
        console.log("User already exists:", existingUsers.users[0].email);
        return new Response(
          JSON.stringify({ error: "Email already registered" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }
    } catch (checkError) {
      console.error("Exception during email check:", checkError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing user: " + checkError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Create the user with appropriate metadata
    try {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: false, // Set to false to send email confirmation
        user_metadata: {
          full_name: adminFullName,
          school_name: schoolName,
          school_code: schoolCode,
          user_type: "school" // This will mark the user as a school admin
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
        email: adminEmail,
      });

      if (verificationError) {
        console.error("Error sending verification email:", verificationError);
        // Still return success but note the verification issue
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "School registered successfully, but there was an issue sending the verification email. Please try to login and request a new verification email.",
            userId: userData.user.id,
            schoolCode,
            email_verification_sent: false
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
        );
      }

      console.log(`School registered successfully. Admin user ID: ${userData.user.id}, verification email sent`);

      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "School registered successfully. Please check your email to verify your account.",
          userId: userData.user.id,
          schoolCode,
          email_verification_sent: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
      );
    } catch (createError) {
      console.error("Exception during user creation:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create user: " + createError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in register-school function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred: " + (error instanceof Error ? error.message : String(error)) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Generate a unique school code
function generateSchoolCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omitting similar looking characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
