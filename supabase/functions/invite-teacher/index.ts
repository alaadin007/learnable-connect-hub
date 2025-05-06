
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request data
    const { email, customMessage } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user making the request to verify permissions
    const authHeader = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the token and get the user
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(authHeader);

    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the requesting user is a supervisor
    const { data: isSupervisor, error: supervisorCheckError } = await supabaseAdmin
      .rpc("is_supervisor", { user_id: requestingUser.id });

    if (supervisorCheckError || !isSupervisor) {
      return new Response(
        JSON.stringify({ error: "Only school supervisors can invite teachers" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the school ID of the requesting user
    const { data: schoolId, error: schoolIdError } = await supabaseAdmin
      .rpc("get_user_school_id", { user_id: requestingUser.id });

    if (schoolIdError || !schoolId) {
      return new Response(
        JSON.stringify({ error: "Could not determine your school" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate a unique invitation token
    const token = generateInvitationToken();

    // Get school info
    const { data: schoolData, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .single();

    if (schoolError) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve school information" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create the invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("teacher_invitations")
      .insert({
        school_id: schoolId,
        email: email,
        invitation_token: token,
        created_by: requestingUser.id,
        status: "pending",
        role: "teacher"
      })
      .select()
      .single();

    if (inviteError) {
      let errorMessage = inviteError.message;
      
      // Check if the error is due to a duplicate email
      if (inviteError.code === "23505" && inviteError.message.includes("email")) { 
        errorMessage = "This email has already been invited";
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Here you would typically send an email to the teacher with the invitation link
    // For now, we'll just return the invitation data
    // In a real implementation, you would use an email service

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitation.id,
        message: "Teacher invitation created successfully",
        // Include the invitation link the admin can copy and send to the teacher
        invitation_link: `${Deno.env.get("APP_URL") || "https://your-app.com"}/accept-invitation/${token}`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateInvitationToken(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 20);
}
