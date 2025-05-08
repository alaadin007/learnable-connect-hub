
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get auth token from request headers
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error(`Error getting user: ${userError?.message || "User not found"}`);
    }
    
    // Get URL parameters
    const url = new URL(req.url);
    const schoolId = url.searchParams.get('school_id');
    
    if (!schoolId) {
      throw new Error("school_id parameter is required");
    }

    // Get the profile of the current user to check their role
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_type, school_id')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      throw new Error(`Error getting user profile: ${profileError.message}`);
    }
    
    // Check if user is authorized to access this school's data
    // Allow school admins and teachers to access student data for their school
    const allowedRoles = ['school', 'school_admin', 'teacher', 'teacher_supervisor'];
    if (userProfile.school_id !== schoolId && !allowedRoles.includes(userProfile.user_type)) {
      throw new Error("Not authorized to access this school's data");
    }
    
    // Get students for this school - now using profiles table with new policies
    const { data: studentsData, error: studentsError } = await supabaseClient
      .from('profiles')
      .select('id, full_name, user_type, created_at, is_active')
      .eq('school_id', schoolId)
      .eq('user_type', 'student');
      
    if (studentsError) {
      throw new Error(`Error fetching students: ${studentsError.message}`);
    }
    
    // Return the students data
    return new Response(
      JSON.stringify({ data: studentsData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
