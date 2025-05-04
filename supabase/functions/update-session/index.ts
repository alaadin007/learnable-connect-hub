
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const requestData = await req.json();
    const { log_id, action, topic } = requestData;

    if (!log_id) {
      return new Response(
        JSON.stringify({ error: "Log ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action !== "increment_query" && !topic) {
      return new Response(
        JSON.stringify({ error: "Either action must be 'increment_query' or topic must be specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result, error;

    if (action === "increment_query") {
      ({ data: result, error } = await supabaseClient.rpc(
        "increment_session_query_count",
        { log_id }
      ));
    } else if (topic) {
      ({ data: result, error } = await supabaseClient.rpc(
        "update_session_topic",
        { log_id, topic }
      ));
    }

    if (error) {
      console.error(`Error performing operation for log_id=${log_id}, action=${action}, topic=${topic}:`, error);
      return new Response(
        JSON.stringify({ error: error.message ?? String(error) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
