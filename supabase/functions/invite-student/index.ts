
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteStudentBody {
  method: "code" | "email";
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

    // Verify the user is logged in and is a teacher
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

    // Get the school_id of the logged in teacher
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
    const { method, email }: InviteStudentBody = await req.json();

    // Handle invite by code
    if (method === "code") {
      // Generate a unique invite code using the database function
      const { data: inviteCode, error: codeError } = await supabaseClient
        .rpc("generate_student_invite_code");

      if (codeError) {
        console.error("Error generating invite code:", codeError);
        return new Response(
          JSON.stringify({ error: "Failed to generate invite code" }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Create an invitation record
      const { data: inviteData, error: inviteError } = await supabaseClient
        .from("student_invites")
        .insert({
          code: inviteCode,
          school_id: schoolId,
          teacher_id: user.id,
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

      return new Response(
        JSON.stringify({ 
          message: "Student invite code generated successfully",
          data: { code: inviteCode }
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    // Handle invite by email
    else if (method === "email" && email) {
      // Generate a unique invite code
      const { data: inviteCode, error: codeError } = await supabaseClient
        .rpc("generate_student_invite_code");

      if (codeError) {
        console.error("Error generating invite code:", codeError);
        return new Response(
          JSON.stringify({ error: "Failed to generate invite code" }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Create an invitation record
      const { data: inviteData, error: inviteError } = await supabaseClient
        .from("student_invites")
        .insert({
          code: inviteCode,
          email: email,
          school_id: schoolId,
          teacher_id: user.id,
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

      // In a production app, you would send an email here with the invite code
      // For now, we'll just return the code in the response
      console.log(`Invite code ${inviteCode} created for email ${email}`);

      return new Response(
        JSON.stringify({ 
          message: "Student invitation created successfully",
          data: { 
            code: inviteCode,
            email: email
          }
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
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
