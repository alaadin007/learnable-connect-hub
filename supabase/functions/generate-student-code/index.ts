
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

    // Verify the user is logged in
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Unauthorized request:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Authenticated user:", user.id);

    // Get the school_id of the logged in user
    const { data: schoolId, error: schoolIdError } = await supabaseClient
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      console.error("Could not determine school ID:", schoolIdError);
      return new Response(
        JSON.stringify({ error: "Could not determine school ID" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Generating code for school ID:", schoolId);
    
    // Generate a unique 8-character alphanumeric code
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing characters
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
        teacher_id: user.id,
        status: "pending"
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      
      // Check if the error is related to teacher_id column not existing
      if (inviteError.message?.includes('teacher_id')) {
        // Try inserting without the teacher_id field
        console.log("Retrying insertion without teacher_id field");
        const { data: retryInviteData, error: retryError } = await supabaseClient
          .from("student_invites")
          .insert({
            code: inviteCode,
            school_id: schoolId,
            status: "pending"
          })
          .select()
          .single();
          
        if (retryError) {
          console.error("Error in retry invitation:", retryError);
          return new Response(
            JSON.stringify({ error: "Failed to create invitation" }),
            { 
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        
        console.log("Invitation created successfully on retry");
        return new Response(
          JSON.stringify({ 
            message: "Student invite code generated successfully",
            code: inviteCode
          }),
          { 
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Invitation created successfully");
    return new Response(
      JSON.stringify({ 
        message: "Student invite code generated successfully",
        code: inviteCode
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Unexpected error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error?.message }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
