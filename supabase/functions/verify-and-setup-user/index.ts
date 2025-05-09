
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Create a Supabase client with the auth context of the requesting user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );
    
    // Get the current user
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
    
    // Get the user metadata
    const userMetadata = user.user_metadata;
    const userType = userMetadata.user_type;
    const schoolId = userMetadata.school_id;
    const schoolCode = userMetadata.school_code;
    
    // Verify if user should be a teacher or student
    if (userType === "teacher") {
      // Add user to teachers table
      const { data: teacherData, error: teacherError } = await supabaseClient
        .from("teachers")
        .insert({
          id: user.id,
          school_id: schoolId,
          is_supervisor: false
        })
        .select()
        .single();
      
      if (teacherError && teacherError.code !== "23505") {  // Ignore unique constraint violations
        console.error("Error creating teacher record:", teacherError);
        return new Response(
          JSON.stringify({ error: "Failed to create teacher record" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } else if (userType === "student") {
      // Add user to students table
      const { data: studentData, error: studentError } = await supabaseClient
        .from("students")
        .insert({
          id: user.id,
          school_id: schoolId,
          status: "pending" // Students start as pending until approved by admin/teacher
        })
        .select()
        .single();
      
      if (studentError && studentError.code !== "23505") {  // Ignore unique constraint violations
        console.error("Error creating student record:", studentError);
        return new Response(
          JSON.stringify({ error: "Failed to create student record" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }
    
    // Ensure the profile has the correct details
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        user_type: userType,
        school_id: schoolId,
        school_code: schoolCode
      })
      .eq("id", user.id);
    
    if (profileError) {
      console.error("Error updating profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, userType }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
