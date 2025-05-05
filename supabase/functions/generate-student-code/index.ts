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

    // Parse request body
    let schoolId;
    try {
      const body = await req.json();
      schoolId = body.schoolId;
      console.log("School ID from request:", schoolId);
      
      if (!schoolId) {
        throw new Error("Missing schoolId in request");
      }
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({ error: "Invalid request. schoolId is required." }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is authorized to generate a school code
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
        JSON.stringify({ error: "You must be a teacher to generate school codes" }),
        { 
          status: 403, 
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify the teacher belongs to the requested school
    if (teacherData.school_id !== schoolId) {
      console.error("Teacher does not belong to the requested school");
      return new Response(
        JSON.stringify({ error: "You can only generate codes for your own school" }),
        { 
          status: 403, 
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate a unique 8-character alphanumeric code
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed potentially confusing characters like O, 0, 1, I
      let result = "";
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    const code = generateCode();
    console.log("Generated school code:", code);

    // Update the school_codes table to keep things in sync
    const { error: schoolCodeError } = await supabaseClient
      .from("school_codes")
      .update({ 
        code: code,
        active: true
      })
      .eq("school_id", schoolId);
    
    if (schoolCodeError) {
      console.warn("Error updating school_codes table:", schoolCodeError);
      // Continue anyway as this is just a sync issue
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        code: code
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
