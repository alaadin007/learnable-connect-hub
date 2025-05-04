
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RemoveUserRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Get authentication info
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Authorization header is missing' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  try {
    // Create Supabase client with the user's token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Create admin client for admin operations
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

    // Verify the caller is authorized (must be a school admin)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if the caller is a school admin (supervisor)
    const { data: callerData, error: callerError } = await supabaseClient
      .from('teachers')
      .select('is_supervisor')
      .eq('id', user.id)
      .single();

    if (callerError || !callerData || !callerData.is_supervisor) {
      return new Response(
        JSON.stringify({ error: 'Only school admins can remove users' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Parse request body
    const { email } = await req.json() as RemoveUserRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get the user ID from the email
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (getUserError || !userData) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const userId = userData.id;

    // Get the school ID of the target user
    const { data: targetTeacher } = await supabaseAdmin
      .from('teachers')
      .select('school_id')
      .eq('id', userId)
      .maybeSingle();
      
    const { data: targetStudent } = await supabaseAdmin
      .from('students')
      .select('school_id')
      .eq('id', userId)
      .maybeSingle();
      
    // Get the caller's school ID
    const { data: callerTeacher } = await supabaseAdmin
      .from('teachers')
      .select('school_id')
      .eq('id', user.id)
      .single();
      
    const targetSchoolId = targetTeacher?.school_id || targetStudent?.school_id;
    const callerSchoolId = callerTeacher?.school_id;
    
    // Ensure the caller can only remove users from their own school
    if (targetSchoolId && callerSchoolId && targetSchoolId !== callerSchoolId) {
      return new Response(
        JSON.stringify({ error: "You can only remove users from your own school" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    console.log(`Removing user: ${email} (${userId})`);
    
    // Delete the user and all related data will cascade due to foreign key constraints
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error removing user:", deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`User ${email} removed successfully`);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${email} has been completely removed from the system.` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in remove-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
