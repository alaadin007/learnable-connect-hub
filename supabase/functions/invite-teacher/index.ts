
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple email sending function - in production you'd use a proper email service
async function sendEmail(email: string, invitationUrl: string, customMessage: string = "", senderName: string = "School Admin") {
  // Log the email that would be sent in development
  console.log(`
    To: ${email}
    Subject: You've been invited to join our school on Learnable
    
    Hi there,
    
    You've been invited to join our school on Learnable. Click the link below to accept the invitation:
    
    ${invitationUrl}
    
    ${customMessage ? `Message from the sender: ${customMessage}` : ''}
    
    This invitation will expire in 7 days.
    
    Regards,
    ${senderName}
    Learnable Team
  `);
  
  // In a production environment, you would integrate with a proper email service
  // such as SendGrid, Mailgun, or AWS SES here
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
        JSON.stringify({ error: "Only school supervisors can invite teachers" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse the request body
    const { email, role = "teacher", customMessage = "", schoolId } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Check if the provided school ID is valid
    let validatedSchoolId = schoolId;
    if (!validatedSchoolId) {
      // If no schoolId was provided, try to get it from the user's profile
      const { data: userSchoolId, error: schoolIdError } = await supabaseClient
        .rpc("get_user_school_id");
        
      if (schoolIdError || !userSchoolId) {
        return new Response(
          JSON.stringify({ error: "Could not determine your school ID" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      validatedSchoolId = userSchoolId;
    }
    
    // Check if school exists
    const { data: schoolData, error: schoolError } = await supabaseClient
      .from("schools")
      .select("name")
      .eq("id", validatedSchoolId)
      .single();
    
    if (schoolError || !schoolData) {
      return new Response(
        JSON.stringify({ error: "Invalid school ID" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Check if the email already has an outstanding invitation
    const { data: existingInvitation, error: existingInviteError } = await supabaseClient
      .from("teacher_invitations")
      .select("id, status, expires_at")
      .eq("email", email)
      .eq("school_id", validatedSchoolId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    
    // If there's a valid invitation, we can just resend the email and update the expiration
    if (existingInvitation && existingInvitation.length > 0) {
      // Get the existing token
      const { data: existingToken, error: tokenError } = await supabaseClient
        .from("teacher_invitations")
        .select("invitation_token")
        .eq("id", existingInvitation[0].id)
        .single();
        
      if (tokenError) {
        console.error("Error fetching existing token:", tokenError);
      }
      
      // Update the expiration date
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now
      
      await supabaseClient
        .from("teacher_invitations")
        .update({ 
          expires_at: newExpiresAt.toISOString(),
          role: role || "teacher" // Update the role if it changed
        })
        .eq("id", existingInvitation[0].id);
      
      // Generate invite URL
      const invitationUrl = `${req.headers.get("origin") || "https://learnable.edu"}/accept-invitation/${existingToken?.invitation_token}`;
      
      // Get sender's name
      const { data: senderData } = await supabaseClient
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
        
      // Send the email
      await sendEmail(email, invitationUrl, customMessage, senderData?.full_name);
      
      return new Response(
        JSON.stringify({
          message: "Invitation resent successfully",
          data: { inviteId: existingInvitation[0].id }
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create a new invitation
    // Generate a unique token for the invitation link
    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    
    // Insert the invitation into the database
    const { data: inviteData, error: inviteError } = await supabaseClient
      .from("teacher_invitations")
      .insert({
        school_id: validatedSchoolId,
        email: email,
        invitation_token: token,
        created_by: user.id,
        status: "pending",
        role: role,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate the invitation URL
    const invitationUrl = `${req.headers.get("origin") || "https://learnable.edu"}/accept-invitation/${token}`;
    
    // Get sender's name
    const { data: senderData } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
      
    // Send the invitation email
    const emailResult = await sendEmail(email, invitationUrl, customMessage, senderData?.full_name);

    return new Response(
      JSON.stringify({ 
        message: "Teacher invitation sent successfully",
        data: { 
          inviteId: inviteData?.id,
          emailResult
        }
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
