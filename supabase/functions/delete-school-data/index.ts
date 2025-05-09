
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteSchoolBody {
  school_id: string;
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

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user is logged in
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

    // Parse the request body
    const { school_id }: DeleteSchoolBody = await req.json();
    
    if (!school_id) {
      return new Response(
        JSON.stringify({ error: "School ID is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify the user is a school admin for this school
    const { data: adminData, error: adminError } = await supabaseClient
      .from("teachers")
      .select("school_id")
      .eq("id", user.id)
      .eq("school_id", school_id)
      .eq("is_supervisor", true)
      .single();

    if (adminError || !adminData) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to delete this school" }),
        { 
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Step 1: Delete assessment submissions
    const { error: subError } = await supabaseAdmin
      .from("assessment_submissions")
      .delete()
      .in("assessment_id", (query) => {
        query
          .select("id")
          .from("assessments")
          .eq("school_id", school_id);
      });

    if (subError) {
      console.error("Error deleting assessment submissions:", subError);
    }

    // Step 2: Delete assessments
    const { error: assessmentError } = await supabaseAdmin
      .from("assessments")
      .delete()
      .eq("school_id", school_id);

    if (assessmentError) {
      console.error("Error deleting assessments:", assessmentError);
    }

    // Step 3: Delete session logs
    const { error: sessionError } = await supabaseAdmin
      .from("session_logs")
      .delete()
      .eq("school_id", school_id);

    if (sessionError) {
      console.error("Error deleting session logs:", sessionError);
    }

    // Step 4: Delete conversations
    const { error: convError } = await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("school_id", school_id);

    if (convError) {
      console.error("Error deleting conversations:", convError);
    }

    // Step 5: Delete documents
    const { error: docError } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("school_id", school_id);

    if (docError) {
      console.error("Error deleting documents:", docError);
    }

    // Step 6: Delete teacher invitations
    const { error: inviteError } = await supabaseAdmin
      .from("teacher_invitations")
      .delete()
      .eq("school_id", school_id);

    if (inviteError) {
      console.error("Error deleting teacher invitations:", inviteError);
    }

    // Step 7: Delete student invites
    const { error: studentInviteError } = await supabaseAdmin
      .from("student_invites")
      .delete()
      .eq("school_id", school_id);

    if (studentInviteError) {
      console.error("Error deleting student invites:", studentInviteError);
    }

    // Step 8: Delete students (clear reference to school)
    const { error: studentError } = await supabaseAdmin
      .from("students")
      .update({ school_id: null })
      .eq("school_id", school_id);

    if (studentError) {
      console.error("Error updating students:", studentError);
    }

    // Step 9: Delete teachers (clear reference to school)
    const { error: teacherError } = await supabaseAdmin
      .from("teachers")
      .update({ school_id: null })
      .eq("school_id", school_id);

    if (teacherError) {
      console.error("Error updating teachers:", teacherError);
    }

    // Step 10: Delete school codes
    const { error: codeError } = await supabaseAdmin
      .from("school_codes")
      .delete()
      .eq("code", (query) => {
        query
          .select("code")
          .from("schools")
          .eq("id", school_id);
      });

    if (codeError) {
      console.error("Error deleting school codes:", codeError);
    }

    return new Response(
      JSON.stringify({ message: "School data deleted successfully" }),
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
