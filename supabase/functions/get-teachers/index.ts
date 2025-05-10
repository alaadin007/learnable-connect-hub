
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
    // Parse the request body
    const { schoolId } = await req.json();

    if (!schoolId) {
      return new Response(
        JSON.stringify({ error: "School ID is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Execute a direct query that doesn't rely on foreign key relationships
    const { data, error } = await supabaseClient
      .from("teachers")
      .select(`
        id,
        is_supervisor,
        created_at
      `)
      .eq("school_id", schoolId);

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get teachers" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get profile data separately
    const teacherIds = data.map((teacher) => teacher.id);
    const { data: profiles, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", teacherIds);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to get teacher profiles" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Combine the data
    const teachers = data.map((teacher) => {
      const profile = profiles.find((p) => p.id === teacher.id);
      return {
        id: teacher.id,
        full_name: profile?.full_name || "Unknown Teacher",
        email: profile?.email || "",
        is_supervisor: teacher.is_supervisor,
        created_at: teacher.created_at,
      };
    });

    return new Response(
      JSON.stringify(teachers),
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
