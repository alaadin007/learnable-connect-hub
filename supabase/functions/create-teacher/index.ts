
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTeacherBody {
  email: string;
  full_name?: string;
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

    // Create Supabase admin client for user creation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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
        JSON.stringify({ error: "Only school supervisors can create teacher accounts" }),
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

    // Get the school details
    const { data: schoolData, error: schoolError } = await supabaseClient
      .from("schools")
      .select("name, code")
      .eq("id", schoolId)
      .single();
    
    if (schoolError || !schoolData) {
      return new Response(
        JSON.stringify({ error: "Could not find school information" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse the request body
    const { email, full_name } = await req.json() as CreateTeacherBody;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate a random password
    const tempPassword = generateRandomPassword(12);

    // Create the user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        user_type: 'teacher',
        full_name: full_name || '',
        school_code: schoolData.code,
        school_name: schoolData.name
      }
    });

    if (createUserError) {
      return new Response(
        JSON.stringify({ error: createUserError.message }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create teacher record in the database
    const { error: teacherInsertError } = await supabaseAdmin
      .from("teachers")
      .insert({
        id: newUser.user.id,
        school_id: schoolId,
        is_supervisor: false
      });

    if (teacherInsertError) {
      console.error("Error creating teacher record:", teacherInsertError);
      
      // Attempt to delete the user if teacher record creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      
      return new Response(
        JSON.stringify({ error: "Failed to create teacher record" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: "Teacher account created successfully",
        data: { 
          user_id: newUser.user.id,
          temp_password: tempPassword
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
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

// Helper function to generate a random password
function generateRandomPassword(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
  }
  
  return result;
}
