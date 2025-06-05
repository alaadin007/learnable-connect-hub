
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Security: Input validation helpers
function validateUserType(userType: string): boolean {
  const validTypes = ["teacher", "student", "school_admin", "school"];
  return validTypes.includes(userType);
}

function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().substring(0, 255); // Limit length and trim
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Security: Only allow POST method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
  
  try {
    // Security: Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create a Supabase client with the auth context of the requesting user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );
    
    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Get the user metadata
    const userMetadata = user.user_metadata;
    
    // Security: Validate and sanitize user metadata
    let userType = userMetadata?.user_type || 'student';
    if (!validateUserType(userType)) {
      userType = 'student'; // Default to student for invalid types
    }
    
    // Normalize user_type: always treat 'school' as 'school_admin'
    if (userType === 'school') {
      userType = 'school_admin';
    }
    
    // Security: Validate and sanitize other metadata fields
    const schoolId = userMetadata?.school_id && validateUUID(userMetadata.school_id) 
      ? userMetadata.school_id 
      : null;
    const schoolCode = sanitizeString(userMetadata?.school_code || '');
    const schoolName = sanitizeString(userMetadata?.school_name || '');
    const fullName = sanitizeString(userMetadata?.full_name || '');
    
    console.log("User setup with metadata:", {
      userType,
      schoolId,
      schoolCode,
      schoolName,
      fullName
    });
    
    // Ensure profile has the correct details with normalized user_type
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .upsert({
        id: user.id,
        user_type: userType,
        school_id: schoolId,
        school_code: schoolCode,
        school_name: schoolName,
        full_name: fullName,
        email: user.email,
        is_active: true
      });
    
    if (profileError) {
      console.error("Error updating profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile", details: profileError }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Process based on user type
    if (userType === "teacher") {
      // Security: Validate school_id is present for teachers
      if (!schoolId) {
        return new Response(
          JSON.stringify({ error: "School ID is required for teachers" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Add user to teachers table
      const { data: teacherData, error: teacherError } = await supabaseClient
        .from("teachers")
        .insert({
          id: user.id,
          school_id: schoolId,
          is_supervisor: false
        })
        .select()
        .single();
      
      if (teacherError) {
        // Check if it's a unique constraint violation (already exists)
        if (teacherError.code !== "23505") {  // Not a unique constraint violation
          console.error("Error creating teacher record:", teacherError);
          return new Response(
            JSON.stringify({ error: "Failed to create teacher record", details: teacherError }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        } else {
          console.log("Teacher record already exists, skipping creation");
        }
      } else {
        console.log("Created teacher record:", teacherData);
      }
      
      // Add teacher role
      const { error: roleError } = await supabaseClient.rpc('assign_role', { 
        user_id_param: user.id, 
        role_param: 'teacher'
      });
      
      if (roleError) {
        console.error("Error assigning teacher role:", roleError);
      }
      
    } else if (userType === "student") {
      // Security: Validate school_id is present for students
      if (!schoolId) {
        return new Response(
          JSON.stringify({ error: "School ID is required for students" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Add user to students table
      const { data: studentData, error: studentError } = await supabaseClient
        .from("students")
        .insert({
          id: user.id,
          school_id: schoolId,
          status: "pending" // Students start as pending until approved by admin/teacher
        })
        .select()
        .single();
      
      if (studentError) {
        // Check if it's a unique constraint violation (already exists)
        if (studentError.code !== "23505") {  // Not a unique constraint violation
          console.error("Error creating student record:", studentError);
          return new Response(
            JSON.stringify({ error: "Failed to create student record", details: studentError }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        } else {
          console.log("Student record already exists, skipping creation");
        }
      } else {
        console.log("Created student record:", studentData);
      }
      
      // Add student role
      const { error: roleError } = await supabaseClient.rpc('assign_role', { 
        user_id_param: user.id, 
        role_param: 'student'
      });
      
      if (roleError) {
        console.error("Error assigning student role:", roleError);
      }
      
    } else if (userType === "school_admin") {
      // Security: Validate school_id is present for school admins
      if (!schoolId) {
        return new Response(
          JSON.stringify({ error: "School ID is required for school administrators" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Add user to school_admins table
      const { data: adminData, error: adminError } = await supabaseClient
        .from("school_admins")
        .insert({
          id: user.id,
          school_id: schoolId
        })
        .select()
        .single();
      
      if (adminError) {
        // Check if it's a unique constraint violation (already exists)
        if (adminError.code !== "23505") {  // Not a unique constraint violation
          console.error("Error creating school admin record:", adminError);
          return new Response(
            JSON.stringify({ error: "Failed to create school admin record", details: adminError }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        } else {
          console.log("School admin record already exists, skipping creation");
        }
      } else {
        console.log("Created school admin record:", adminData);
      }
      
      // Add school_admin role
      const { error: roleError } = await supabaseClient.rpc('assign_role', { 
        user_id_param: user.id, 
        role_param: 'school_admin'
      });
      
      if (roleError) {
        console.error("Error assigning school_admin role:", roleError);
      }
      
      // Set teacher as supervisor
      const { error: supervisorError } = await supabaseClient
        .from("teachers")
        .upsert({
          id: user.id,
          school_id: schoolId,
          is_supervisor: true
        });
        
      if (supervisorError) {
        console.error("Error setting teacher as supervisor:", supervisorError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        userType: userType,  // Return the normalized type
        originalType: userMetadata?.user_type || 'student', // For debugging purposes
        normalized: userMetadata?.user_type === 'school' && userType === 'school_admin'
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
