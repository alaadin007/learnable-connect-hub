
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateInviteBody {
  school_id: string;
  method?: "code" | "email";
  email?: string;
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

    // Verify the user is logged in and has permission
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: "You must be logged in to generate invites" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse the request body
    let requestBody: GenerateInviteBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ error: "Bad Request", details: "Invalid JSON body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { school_id, method = "code", email } = requestBody;

    if (!school_id) {
      return new Response(
        JSON.stringify({ error: "Bad Request", details: "School ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user has permission to generate codes for this school
    const { data: permData, error: permError } = await supabaseClient.rpc('is_school_admin');
    const { data: teacherData } = await supabaseClient
      .from("teachers")
      .select("school_id")
      .eq("id", user.id)
      .eq("school_id", school_id)
      .single();

    if ((permError || !permData) && !teacherData) {
      return new Response(
        JSON.stringify({ error: "Forbidden", details: "You don't have permission to generate codes for this school" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate a unique invitation code using the Supabase RPC function
    const { data: inviteData, error: inviteError } = await supabaseClient.rpc(
      'create_student_invitation', { school_id_param: school_id }
    );

    if (inviteError) {
      console.error("Error generating invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Internal Server Error", details: inviteError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // If using email method, update the invitation with the email
    if (method === "email" && email) {
      const { error: updateError } = await supabaseClient
        .from("student_invites")
        .update({ email: email, teacher_id: user.id })
        .eq("id", inviteData[0].invite_id);

      if (updateError) {
        console.error("Error updating invitation with email:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Student invitation code generated successfully",
        code: inviteData[0].code,
        expires_at: inviteData[0].expires_at,
        invite_id: inviteData[0].invite_id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", details: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
