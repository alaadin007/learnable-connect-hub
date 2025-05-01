
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteTeacherBody {
  email: string;
}

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

    // Verify the user is logged in and is a school supervisor
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

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
    const { data: teacherData, error: teacherError } = await supabaseClient
      .rpc("is_supervisor", { user_id: user.id });

    if (teacherError || !teacherData) {
      return new Response(
        JSON.stringify({ error: "Only school supervisors can invite teachers" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the school_id of the logged in user
    const { data: schoolId, error: schoolIdError } = await supabaseClient
      .rpc("get_user_school_id");

    if (schoolIdError || !schoolId) {
      return new Response(
        JSON.stringify({ error: "Could not determine school ID" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse the request body
    const { email } = await req.json() as InviteTeacherBody;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate a unique token
    const token = crypto.randomUUID().replace(/-/g, "");

    // Create an invitation record
    const { data: inviteData, error: inviteError } = await supabaseClient
      .from("teacher_invites")
      .insert({
        email,
        token,
        school_id: schoolId,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use RPC to invite teacher with existing function
    const { data: inviteResult, error: inviteRpcError } = await supabaseClient
      .rpc("invite_teacher", {
        teacher_email: email
      });

    if (inviteRpcError) {
      console.error("Error inviting teacher:", inviteRpcError);
      
      // Delete the invitation record if the RPC fails
      await supabaseClient
        .from("teacher_invites")
        .delete()
        .eq("id", inviteData.id);
        
      return new Response(
        JSON.stringify({ error: inviteRpcError.message }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: "Teacher invitation sent successfully",
        data: { inviteId: inviteData.id }
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
