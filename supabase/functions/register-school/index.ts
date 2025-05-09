
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSchoolCode(): string {
  // Generate a random code for the school (e.g., "SCH-12345")
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
  let result = 'SCH';
  
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { schoolName, adminEmail, adminFullName, adminPassword, contactEmail } = await req.json();

    if (!schoolName || !adminEmail || !adminFullName || !adminPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if email is already registered
    const { data: existingUsers, error: userCheckError } = await supabaseClient.auth.admin.listUsers({
      filters: {
        email: adminEmail,
      },
    });

    if (userCheckError) {
      console.error("Error checking existing user:", userCheckError);
      return new Response(
        JSON.stringify({ error: "Failed to check email availability" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (existingUsers?.users?.length > 0) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate unique school code
    const schoolCode = generateSchoolCode();

    // Create school record
    const { data: school, error: schoolError } = await supabaseClient
      .from("schools")
      .insert({
        name: schoolName,
        code: schoolCode,
        contact_email: contactEmail || adminEmail,
      })
      .select()
      .single();

    if (schoolError) {
      console.error("Error creating school:", schoolError);
      return new Response(
        JSON.stringify({ error: "Failed to create school record" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create school code record
    await supabaseClient
      .from("school_codes")
      .insert({
        code: schoolCode,
        school_name: schoolName,
        active: true,
        school_id: school.id
      });

    // Now create the admin user
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,  // Auto-confirm email for admin
      user_metadata: {
        full_name: adminFullName,
        school_code: schoolCode,
        user_type: 'school_admin',
        school_id: school.id
      }
    });

    if (userError) {
      console.error("Error creating admin user:", userError);
      
      // If user creation fails, clean up the school record to avoid orphaned data
      await supabaseClient
        .from("schools")
        .delete()
        .eq("id", school.id);
        
      return new Response(
        JSON.stringify({ error: userError.message || "Failed to create admin user" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Successfully registered school and admin:", {
      school_id: school.id,
      school_code: schoolCode,
      school_name: schoolName,
      admin_id: userData.user.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        school_id: school.id,
        school_code: schoolCode,
        school_name: schoolName,
        admin_id: userData.user.id
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in register-school function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
