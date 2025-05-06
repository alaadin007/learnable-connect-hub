
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request data
    const { email, full_name } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with admin privileges using service role key
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

    // Get user making the request to verify permissions
    const authHeader = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the token and get the user
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(authHeader);

    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if the requesting user is a supervisor
    const { data: isSupervisor, error: supervisorCheckError } = await supabaseAdmin
      .rpc("is_supervisor", { user_id: requestingUser.id });

    if (supervisorCheckError || !isSupervisor) {
      return new Response(
        JSON.stringify({ error: "Only school supervisors can create teacher accounts" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the school ID of the requesting user
    const { data: schoolId, error: schoolIdError } = await supabaseAdmin
      .rpc("get_user_school_id", { user_id: requestingUser.id });

    if (schoolIdError || !schoolId) {
      return new Response(
        JSON.stringify({ error: "Could not determine your school" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate a random password
    const tempPassword = generateTemporaryPassword();

    // Create the teacher user with the temporary password
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Automatically confirm email
      user_metadata: {
        full_name: full_name || email.split("@")[0],
        user_type: "teacher",
        school_code: await getSchoolCode(supabaseAdmin, schoolId)
      }
    });

    if (createUserError) {
      return new Response(
        JSON.stringify({ error: createUserError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Add the teacher to the teachers table
    const { error: insertTeacherError } = await supabaseAdmin
      .from("teachers")
      .insert({
        id: newUser.user.id,
        school_id: schoolId,
        is_supervisor: false
      });

    if (insertTeacherError) {
      // If there was an error, attempt to delete the user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      
      return new Response(
        JSON.stringify({ error: insertTeacherError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Add the teacher role to the user
    await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "teacher"
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Teacher account created successfully",
        email,
        temp_password: tempPassword
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateTemporaryPassword(length: number = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}

async function getSchoolCode(supabaseAdmin: any, schoolId: string): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from("schools")
      .select("code")
      .eq("id", schoolId)
      .single();
    
    if (error || !data) {
      return "";
    }
    
    return data.code;
  } catch (error) {
    console.error("Error getting school code:", error);
    return "";
  }
}
