
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
    const { schoolName, adminEmail, adminPassword, adminFullName } = await req.json() as RegisterSchoolRequest;

    if (!schoolName || !adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Generate a unique school code
    const schoolCode = generateSchoolCode();

    console.log(`Registering school: ${schoolName} with admin: ${adminEmail}`);
    
    // Check if user already exists - using the correct method
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_type')
      .eq('id', adminEmail)
      .maybeSingle();
    
    // Using auth API to check email existence
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = authData?.users.find(user => user.email === adminEmail);
    
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    if (authError) {
      console.error("Error checking existing user:", authError);
      return new Response(
        JSON.stringify({ error: "Error checking existing user: " + authError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Create the user with appropriate metadata
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Set to true to avoid sending password reset email
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
  } catch (error) {
    console.error("Error in register-school function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
