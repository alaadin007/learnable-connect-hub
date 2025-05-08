
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
    
    // Create a Supabase client with the authorization token if present
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );

    // Get request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.warn("No request body or invalid JSON:", e);
      body = {};
    }

    const { topic = null, userId = null } = body;
    
    // If userId is provided, use it (for test accounts)
    // Otherwise get user from auth
    let userIdToUse = userId;
    let schoolIdToUse = null;
    
    if (!userIdToUse) {
      // Verify the user session if no userId was explicitly provided
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        console.error("Authentication error or no user found:", authError);
        return new Response(JSON.stringify({ 
          error: "Unauthorized or no user found",
          details: authError?.message || "No authenticated user"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      userIdToUse = user.id;
    }

    // First try to get school_id from profiles table directly - more efficient
    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("school_id, organization")
      .eq("id", userIdToUse)
      .single();
      
    if (profileData?.school_id) {
      schoolIdToUse = profileData.school_id;
    } else if (profileData?.organization?.id) {
      schoolIdToUse = profileData.organization.id;
    }

    // If still no school found, check students table
    if (!schoolIdToUse) {
      const { data: studentData } = await supabaseClient
        .from("students")
        .select("school_id")
        .eq("id", userIdToUse)
        .single();
        
      if (studentData?.school_id) {
        schoolIdToUse = studentData.school_id;
      } else {
        // If not a student, check teachers table
        const { data: teacherData } = await supabaseClient
          .from("teachers")
          .select("school_id")
          .eq("id", userIdToUse)
          .single();
          
        if (teacherData?.school_id) {
          schoolIdToUse = teacherData.school_id;
        }
      }
    }
    
    // For test users, create a mock school ID if none found
    if (!schoolIdToUse && (userIdToUse.startsWith('test-') || (body.test_mode === true))) {
      schoolIdToUse = 'test-school-0';
      
      // Check if this is indeed a test account
      if (userIdToUse.startsWith('test-')) {
        // For test accounts, success even without creating a database entry
        return new Response(JSON.stringify({ 
          success: true, 
          logId: `test-session-${Date.now()}`,
          test_mode: true
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    if (!schoolIdToUse) {
      console.error("No school ID found for user");
      return new Response(JSON.stringify({ 
        error: "School not found",
        details: "User has no associated school in any table" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Insert the session log
    const { data: logData, error: insertError } = await supabaseClient
      .from("session_logs")
      .insert({
        user_id: userIdToUse,
        school_id: schoolIdToUse,
        topic_or_content_used: topic || "General Chat",
        session_start: new Date().toISOString()
      })
      .select("id")
      .single();
      
    if (insertError) {
      console.error("Error creating session log:", insertError);
      return new Response(JSON.stringify({ 
        error: insertError.message,
        details: "Failed to create session log"
      }), {
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
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: err.message || "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
