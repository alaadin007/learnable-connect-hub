
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SchoolRegistrationData {
  schoolName: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get request data
    const { schoolName, adminEmail, adminPassword, adminFullName } = await req.json() as SchoolRegistrationData;
    console.log(`Registering school: ${schoolName} with admin: ${adminEmail}`);
    
    // Get request URL to determine origin for redirects
    const requestUrl = new URL(req.url);
    const origin = requestUrl.origin;
    console.log(`Request origin: ${origin}`);
    console.log(`Frontend URL: ${Deno.env.get("FRONTEND_URL") || origin}`);
    
    // Validate required fields
    if (!schoolName || !adminEmail || !adminPassword || !adminFullName) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields. School name, admin email, admin password, and admin full name are required." 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Create a Supabase client with the service role key (for admin operations)
    // IMPORTANT: This key is only available server-side in edge functions
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") as string,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
    );
    
    // Generate a school code
    const { data: schoolCodeData, error: schoolCodeError } = await supabaseAdmin.rpc(
      "generate_school_code"
    );
    
    if (schoolCodeError) {
      console.error("Error generating school code:", schoolCodeError);
      return new Response(
        JSON.stringify({ error: "Failed to generate school code" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const schoolCode = schoolCodeData;
    
    // First create the entry in school_codes table
    const { error: schoolCodeInsertError } = await supabaseAdmin
      .from("school_codes")
      .insert({
        code: schoolCode,
        school_name: schoolName,
        active: true
      });
    
    if (schoolCodeInsertError) {
      console.error("Error inserting school code:", schoolCodeInsertError);
      return new Response(
        JSON.stringify({ error: "Failed to register school code" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Create the school record
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from("schools")
      .insert({
        name: schoolName,
        code: schoolCode
      })
      .select()
      .single();
    
    if (schoolError || !schoolData) {
      console.error("Error creating school:", schoolError);
      return new Response(
        JSON.stringify({ error: "Failed to create school record" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const schoolId = schoolData.id;
    console.log(`School created with ID: ${schoolId}`);
    
    // Get the frontend URL for redirects - either from env or fallback to request origin
    const frontendURL = Deno.env.get("FRONTEND_URL") || origin;
    const redirectURL = `${frontendURL}/login?email_confirmed=true`;
    console.log(`Email confirmation redirect URL: ${redirectURL}`);
    
    // Create the admin user with auth.admin
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: false, // Require email confirmation
      user_metadata: {
        full_name: adminFullName,
        user_type: "school", // Designate as school admin
        school_code: schoolCode,
        school_name: schoolName
      },
      // Add redirect URLs to ensure confirmation redirects to the right place
      email_confirm_redirect_url: redirectURL
    });
    
    if (userError || !userData.user) {
      console.error("Error creating admin user:", userError);
      // Clean up: remove school if user creation fails
      await supabaseAdmin
        .from("schools")
        .delete()
        .eq("id", schoolId);
        
      return new Response(
        JSON.stringify({ error: "Failed to create admin user account" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const adminUserId = userData.user.id;
    console.log(`Admin user created with ID: ${adminUserId}`);
    
    // Create profile record
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: adminUserId,
        user_type: "school",
        full_name: adminFullName,
        school_code: schoolCode,
        school_name: schoolName
      });
    
    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Continue despite profile error, as the handle_new_user trigger should handle this
    }
    
    // Create teacher record with supervisor privileges
    const { error: teacherError } = await supabaseAdmin
      .from("teachers")
      .insert({
        id: adminUserId,
        school_id: schoolId,
        is_supervisor: true
      });
    
    if (teacherError) {
      console.error("Error creating teacher record:", teacherError);
      // Clean up: remove user if teacher record creation fails
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      
      return new Response(
        JSON.stringify({ error: "Failed to create teacher admin record" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Force send a confirmation email to ensure it's delivered
    try {
      const { error: resendError } = await supabaseAdmin.auth.admin.resendUserConfirmationEmail(adminEmail);
      
      if (resendError) {
        console.error("Error sending confirmation email:", resendError);
      } else {
        console.log(`Confirmation email sent to ${adminEmail}`);
      }
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }
    
    // Return success with school and admin info
    return new Response(
      JSON.stringify({ 
        success: true, 
        schoolId, 
        schoolCode,
        adminUserId,
        message: "School and admin account successfully created. Please check your email to verify your account."
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
