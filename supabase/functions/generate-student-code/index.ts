
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log("Starting generate-student-code function");
    
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Unauthorized access attempt:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized access" }),
        { 
          status: 401, 
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("User authenticated:", user.id);

    // Check if user is a school admin or teacher with permission
    const { data: teacherData, error: teacherError } = await supabaseClient
      .from("teachers")
      .select("school_id, is_supervisor")
      .eq("id", user.id)
      .single();

    if (teacherError) {
      console.error("Error checking teacher permissions:", teacherError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { 
          status: 403, 
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!teacherData) {
      console.error("User is not a teacher");
      return new Response(
        JSON.stringify({ error: "You must be a teacher to generate student codes" }),
        { 
          status: 403, 
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const schoolId = teacherData.school_id;
    console.log("Generating code for school ID:", schoolId);

    // Generate a unique 8-character alphanumeric code
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed potentially confusing characters
      let result = "";
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    const inviteCode = generateCode();
    console.log("Generated invite code:", inviteCode);

    // Create an invitation record
    const { data: inviteData, error: inviteError } = await supabaseClient
      .from("student_invites")
      .insert({
        code: inviteCode,
        school_id: schoolId,
        status: "pending"
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Invitation created successfully:", inviteData);
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Student invite code generated successfully",
        code: inviteCode
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error?.message || String(error) 
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
