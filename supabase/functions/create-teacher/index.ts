
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random secure password
function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Create authenticated client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Create admin client for operations requiring higher privileges
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user is logged in and is a school supervisor
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is a school supervisor
    const { data: isSupervisor, error: supervisorError } = await supabaseClient
      .rpc("is_supervisor", { user_id: user.id });

    if (supervisorError || !isSupervisor) {
      return new Response(
        JSON.stringify({ error: "Only school supervisors can create teacher accounts" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse the request body
    const { email, full_name } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the school information of the creator
    const { data: teacherData, error: teacherError } = await supabaseClient
      .from("teachers")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (teacherError || !teacherData) {
      console.error("Error getting school info:", teacherError);
      return new Response(
        JSON.stringify({ error: "Failed to get school information" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the school name and code
    const { data: schoolData, error: schoolError } = await supabaseClient
      .from("schools")
      .select("name, code")
      .eq("id", teacherData.school_id)
      .single();

    if (schoolError || !schoolData) {
      console.error("Error getting school name:", schoolError);
      return new Response(
        JSON.stringify({ error: "Failed to get school name" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate a temporary password
    const tempPassword = generatePassword();

    // Create the teacher user with admin privileges
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name || email.split('@')[0], // Use provided name or derive from email
        user_type: "teacher", // CRITICAL: Explicitly set user_type for teacher
        school_code: schoolData.code,
        school_name: schoolData.name
      }
    });

    if (createError) {
      console.error("Error creating teacher account:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create teacher account", details: createError.message }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!userData || !userData.user) {
      console.error("No user data returned when creating teacher");
      return new Response(
        JSON.stringify({ error: "Failed to create teacher account - no user data returned" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const teacherId = userData.user.id;
    
    // Manually create profile record to ensure user_type is set
    console.log("Creating profile record for teacher:", teacherId);
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: teacherId,
        user_type: "teacher", // Explicitly set user_type to avoid null constraint violation
        full_name: full_name || email.split('@')[0], 
        school_code: schoolData.code,
        school_name: schoolData.name
      });
      
    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Continue anyway, as the handle_new_user trigger may handle this
      console.log("Continuing despite profile error - handle_new_user trigger should handle this");
    }

    // Register as teacher in the school
    const { error: teacherRegError } = await supabaseAdmin
      .from("teachers")
      .insert({
        id: teacherId,
        school_id: teacherData.school_id,
        is_supervisor: false // Regular teacher, not supervisor
      });

    if (teacherRegError) {
      console.error("Error registering teacher:", teacherRegError);
      
      // Clean up on failure
      try {
        await supabaseAdmin.auth.admin.deleteUser(teacherId);
        console.log("Deleted user after teacher registration failed");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to register teacher", details: teacherRegError.message }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: "Teacher account created successfully",
        temp_password: tempPassword
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
