
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

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse request body
    let method, email;
    try {
      const body = await req.json();
      method = body.method;
      email = body.email;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate request parameters
    if (method !== "email" || !email) {
      return new Response(
        JSON.stringify({ error: "Invalid parameters. Required: method='email', email=<valid email>" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get the school_id of the user (from teachers or schools table)
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
    
    // If not a teacher, check if user is a school admin
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
        JSON.stringify({ error: "User is not associated with any school" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Generate a random code
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    // Create the invitation record
    const { data: inviteData, error: inviteError } = await supabaseClient
      .from("student_invites")
      .insert({
        school_id: schoolId,
        email: email,
        status: "pending",
        code: generateCode(), // Also generate a code for tracking
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();
      
    if (inviteError) {
      return new Response(
        JSON.stringify({ error: "Failed to create invitation", details: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // In a real implementation, you would send an email here
    // This is a placeholder for the email sending functionality
    console.log(`Would send email to ${email} with invitation to join school ${schoolId}`);
    
    // For this demo, we're just returning success without actually sending an email
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation created for ${email}`,
        invite_id: inviteData.id,
        expires_at: inviteData.expires_at
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in invite-student function:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
