
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Get the authorization token from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a Supabase client with the authorization token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user session to ensure they're authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.warn("No request body or invalid JSON:", e);
      body = {};
    }

    const { topic = null } = body;

    // Get the user's school_id from either students or teachers table
    let schoolId = null;
    
    // First check students table
    const { data: studentData } = await supabaseClient
      .from("students")
      .select("school_id")
      .eq("id", user.id)
      .single();
      
    if (studentData?.school_id) {
      schoolId = studentData.school_id;
    } else {
      // If not a student, check teachers table
      const { data: teacherData } = await supabaseClient
        .from("teachers")
        .select("school_id")
        .eq("id", user.id)
        .single();
        
      if (teacherData?.school_id) {
        schoolId = teacherData.school_id;
      }
    }
    
    if (!schoolId) {
      return new Response(JSON.stringify({ error: "User has no associated school" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Insert the session log directly instead of using RPC
    const { data: logData, error: insertError } = await supabaseClient
      .from("session_logs")
      .insert({
        user_id: user.id,
        school_id: schoolId,
        topic_or_content_used: topic || "General Chat",
        session_start: new Date().toISOString()
      })
      .select("id")
      .single();
      
    if (insertError) {
      console.error("Error creating session log:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, logId: logData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
