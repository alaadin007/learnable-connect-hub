
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Get authorization token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user ID from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request data
    const { provider, apiKey } = await req.json();
    
    if (!provider || !apiKey) {
      return new Response(
        JSON.stringify({ error: "Provider and apiKey are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Encrypt the API key (in a real implementation, you would use encryption)
    // We're storing the key in the database for simplicity in this example
    // In production, consider using a dedicated secret management service
    
    // Check if user already has an API key for this provider
    const { data: existingKey } = await supabaseClient
      .from('user_api_keys')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();

    let result;
    
    if (existingKey) {
      // Update existing key
      result = await supabaseClient
        .from('user_api_keys')
        .update({ api_key: apiKey, updated_at: new Date().toISOString() })
        .eq('id', existingKey.id);
    } else {
      // Insert new key
      result = await supabaseClient
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          provider,
          api_key: apiKey
        });
    }

    if (result.error) {
      throw result.error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in save-api-key function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
