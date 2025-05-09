
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateInviteBody {
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

    // Verify the user is logged in and is a teacher or school admin
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

    // Get the profile of the user to check their type
    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("user_type, school_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: "Could not verify user permissions" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is authorized (teacher or school admin)
    const isAuthorized = profileData.user_type === "teacher" || 
                         profileData.user_type === "school" || 
                         profileData.user_type === "school_admin";
    
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Only teachers and school admins can generate student invites" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the school_id from the user's profile
    if (!profileData.school_id) {
      // Try to get it from teachers table
      const { data: teacherData, error: teacherError } = await supabaseClient
        .from("teachers")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (teacherError || !teacherData?.school_id) {
        return new Response(
          JSON.stringify({ error: "Could not determine school ID" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      profileData.school_id = teacherData.school_id;
    }

    // Parse the request body
    const { method, email }: GenerateInviteBody = await req.json();

    // Generate a unique invite code (a simple function to generate a random string)
    const generateInviteCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const inviteCode = generateInviteCode();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // Expires in 7 days

    // Handle invite by code
    if (method === "code") {
      console.log(`Generating code invite for school ${profileData.school_id}`);
      
      // Insert the invite into the student_invites table
      const { data: invite, error: inviteError } = await supabaseClient
        .from("student_invites")
        .insert({
          school_id: profileData.school_id,
          teacher_id: user.id,
          code: inviteCode,
          expires_at: expirationDate.toISOString(),
          status: "pending"
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return new Response(
          JSON.stringify({ error: "Failed to create invite" }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          message: "Student invite code generated successfully",
          code: inviteCode
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    // Handle invite by email
    else if (method === "email" && email) {
      console.log(`Generating email invite for ${email} in school ${profileData.school_id}`);
      
      // Insert the invite into the student_invites table
      const { data: invite, error: inviteError } = await supabaseClient
        .from("student_invites")
        .insert({
          school_id: profileData.school_id,
          teacher_id: user.id,
          code: inviteCode,
          email: email,
          expires_at: expirationDate.toISOString(),
          status: "pending"
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Error creating invite:", inviteError);
        return new Response(
          JSON.stringify({ error: "Failed to create invite" }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // In a production environment, here you would send an email with the invite code
      return new Response(
        JSON.stringify({ 
          message: "Student invite created successfully",
          code: inviteCode,
          email: email
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
