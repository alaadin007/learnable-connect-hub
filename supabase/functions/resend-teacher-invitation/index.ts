
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple email sending function - in production you'd use a proper email service
async function sendEmail(email: string, invitationUrl: string, senderName: string = "School Admin", role: string = "teacher") {
  // Log the email that would be sent in development
  console.log(`
    To: ${email}
    Subject: Reminder: You've been invited to join our school on Learnable
    
    Hi there,
    
    This is a reminder that you've been invited to join our school on Learnable as a ${role}. Click the link below to accept the invitation:
    
    ${invitationUrl}
    
    This invitation will expire in 7 days.
    
    Regards,
    ${senderName}
    Learnable Team
  `);
  
  // In a production environment, you would integrate with a proper email service
  return { success: true, message: "Email would be sent in production" };
}

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
        JSON.stringify({ error: "Only school supervisors can resend invitations" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse the request body
    const { invitationId } = await req.json();

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: "Invitation ID is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the invitation details
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("teacher_invitations")
      .select("id, email, invitation_token, school_id, role")
      .eq("id", invitationId)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invalid invitation ID" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if the user belongs to the same school as the invitation
    const { data: userSchoolId } = await supabaseClient
      .rpc("get_user_school_id");
      
    if (userSchoolId !== invitation.school_id) {
      return new Response(
        JSON.stringify({ error: "You can only resend invitations for your own school" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update the expiration date to extend it
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now
    
    await supabaseClient
      .from("teacher_invitations")
      .update({ 
        expires_at: newExpiresAt.toISOString(),
        status: "pending" // Reset status to pending if it was expired
      })
      .eq("id", invitationId);
    
    // Generate invite URL
    const invitationUrl = `${req.headers.get("origin") || "https://learnable.edu"}/accept-invitation/${invitation.invitation_token}`;
    
    // Get sender's name
    const { data: senderData } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
      
    // Send the email
    await sendEmail(invitation.email, invitationUrl, senderData?.full_name, invitation.role || 'teacher');

    return new Response(
      JSON.stringify({ 
        message: "Invitation resent successfully",
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
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
