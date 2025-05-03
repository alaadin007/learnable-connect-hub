
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
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
        JSON.stringify({ error: "Only school supervisors can invite teachers" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse the request body
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

    // Get the school information of the inviter
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

    // Get the school name
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

    // Generate an invitation token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .rpc("generate_invitation_token");
    
    if (tokenError) {
      console.error("Error generating token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to generate invitation token" }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const token = tokenData;
    
    // Create invitation record in teacher_invitations
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("teacher_invitations")
      .insert({
        school_id: teacherData.school_id,
        email: email,
        invitation_token: token,
        created_by: user.id
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation record:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation record" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // CRITICAL FIX: Use admin client to send the invitation with proper metadata
    // This ensures the user_type is set during the invitation process
    const { data: inviteData, error: sendError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      // Set the metadata during invitation
      data: {
        user_type: "teacher", // CRITICAL: Explicitly set user_type
        school_code: schoolData.code,
        school_name: schoolData.name,
        invitation_token: token
      },
      redirectTo: `${Deno.env.get("FRONTEND_URL") || req.headers.get("origin")}/invite/${token}`
    });

    if (sendError) {
      console.error("Error sending invitation:", sendError);
      // Clean up the invitation record if the email failed to send
      await supabaseClient
        .from("teacher_invitations")
        .delete()
        .eq("id", invitation.id);
        
      return new Response(
        JSON.stringify({ error: sendError.message }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: "Teacher invitation sent successfully",
        data: { inviteId: invitation.id }
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
