
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
    // Create a Supabase client with the Auth context of the logged-in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized, please log in" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Determine the school_id based on user role
    let schoolId = null;
    
    // Check if user is a teacher
    const { data: teacherData } = await supabaseClient
      .from("teachers")
      .select("school_id")
      .eq("id", user.id)
      .single();
    
    if (teacherData?.school_id) {
      schoolId = teacherData.school_id;
    }
    
    // If not a teacher, check if user is school admin
    if (!schoolId) {
      const { data: schoolData } = await supabaseClient
        .from("schools")
        .select("id")
        .eq("id", user.id)
        .single();
        
      if (schoolData?.id) {
        schoolId = schoolData.id;
      }
    }
    
    if (!schoolId) {
      return new Response(
        JSON.stringify({ error: "No associated school found for this user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Generate a random 8-character invitation code
    const generateCode = () => {
      // Use characters that are less likely to be confused with each other
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const inviteCode = generateCode();
    
    // Store the code in the student_invites table
    const { data: inviteData, error: inviteError } = await supabaseClient
      .from("student_invites")
      .insert({
        school_id: schoolId,
        code: inviteCode,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      .select()
      .single();
      
    if (inviteError) {
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        code: inviteCode,
        expires_at: inviteData.expires_at,
        invite_id: inviteData.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
