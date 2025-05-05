
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
    // Create a Supabase client with the Auth context of the logged-in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Use service role key to create bucket
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized, please log in" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check if user-content bucket exists
    const { data: buckets, error: bucketsError } = await supabaseClient
      .storage
      .listBuckets();
      
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      return new Response(
        JSON.stringify({ error: "Failed to check storage buckets", details: bucketsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Create the bucket if it doesn't exist
    const userContentBucket = buckets?.find(b => b.name === 'user-content');
    
    if (!userContentBucket) {
      console.log("Creating user-content bucket");
      const { error: createError } = await supabaseClient
        .storage
        .createBucket('user-content', {
          public: false,
          fileSizeLimit: 52428800 // 50MB
        });
        
      if (createError) {
        console.error("Error creating bucket:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create storage bucket", details: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Set bucket policies for authenticated users
    // Allow authenticated users to upload and read files from user-content bucket
    if (userContentBucket || !userContentBucket) { // Whether new or existing
      const { error: policyError } = await supabaseClient
        .storage
        .from('user-content')
        .setAccessControl({
          acl: [
            {
              userId: user.id,
              operation: "read",
              permission: "allow",
            },
            {
              userId: user.id,
              operation: "create",
              permission: "allow",
            },
            {
              userId: user.id,
              operation: "update",
              permission: "allow",
            },
            {
              userId: user.id,
              operation: "delete",
              permission: "allow",
            }
          ]
        });
        
      if (policyError) {
        console.error("Error setting bucket policies:", policyError);
        // Don't return error as the bucket creation already succeeded
      } else {
        console.log("Bucket policies set successfully");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Document storage ready",
        bucket: userContentBucket ? "user-content bucket already exists" : "user-content bucket created successfully"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Setup document storage error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
