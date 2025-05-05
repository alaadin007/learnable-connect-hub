
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

    // Get the request body
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if the user exists in auth.users
    const { data: userData, error: userError } = await supabaseClient.auth.admin
      .getUserByEmail(email);

    if (userError) {
      console.error("Error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: "Error fetching user" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!userData) {
      return new Response(
        JSON.stringify({ error: "User not found with provided email" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userId = userData.id;
    
    // Get the profile information which includes user_type
    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Error fetching profile data" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get additional role information based on user_type
    let additionalInfo = {};
    
    if (profileData.user_type === "teacher") {
      const { data: teacherData, error: teacherError } = await supabaseClient
        .from("teachers")
        .select("*")
        .eq("id", userId)
        .single();
        
      if (!teacherError && teacherData) {
        additionalInfo = {
          is_supervisor: teacherData.is_supervisor,
          school_id: teacherData.school_id
        };
      }
    } else if (profileData.user_type === "student") {
      const { data: studentData, error: studentError } = await supabaseClient
        .from("students")
        .select("*")
        .eq("id", userId)
        .single();
        
      if (!studentError && studentData) {
        additionalInfo = { 
          school_id: studentData.school_id 
        };
      }
    } else if (profileData.user_type === "school") {
      const { data: schoolData, error: schoolError } = await supabaseClient
        .from("teachers")
        .select("*, schools(*)")
        .eq("id", userId)
        .single();
        
      if (!schoolError && schoolData) {
        additionalInfo = {
          is_supervisor: schoolData.is_supervisor,
          school_id: schoolData.school_id,
          school_info: schoolData.schools
        };
      }
    }

    // Return the combined user role information
    return new Response(
      JSON.stringify({
        email: email,
        userId: userId,
        role: profileData.user_type,
        profile: profileData,
        additionalInfo: additionalInfo
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error?.message }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
