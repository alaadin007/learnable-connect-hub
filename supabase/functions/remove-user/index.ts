
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
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
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse the request body
    const { email }: RequestBody = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // First, we need to find the user's ID by email
    const { data: userData, error: userError } = await supabaseAdmin
      .from("auth.users")
      .select("id")
      .eq("email", email)
      .single();

    // If using the direct query doesn't work (likely due to auth restrictions), try auth API
    let userId: string | undefined;
    
    if (userError || !userData) {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        return new Response(
          JSON.stringify({ error: "Failed to find user" }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const foundUser = authUsers.users.find(u => u.email === email);
      if (foundUser) {
        userId = foundUser.id;
      } else {
        return new Response(
          JSON.stringify({ error: "User not found with email: " + email }),
          { 
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } else {
      userId = userData.id;
    }

    // Delete from profiles table
    const { error: profilesError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    // Delete from students table if exists
    await supabaseAdmin
      .from("students")
      .delete()
      .eq("id", userId);

    // Delete from teachers table if exists
    await supabaseAdmin
      .from("teachers")
      .delete()
      .eq("id", userId);

    // Delete the user from auth.users using the admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return new Response(
        JSON.stringify({ error: "Failed to delete user: " + deleteError.message }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: "User completely removed from the database", email }),
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
