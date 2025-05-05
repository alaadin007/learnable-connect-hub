
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

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
    // Create Supabase client with admin privileges
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    
    // Check if the user-content bucket exists
    const { data: buckets, error: bucketsError } = await supabaseClient.storage.listBuckets();
    
    if (bucketsError) {
      console.error("Error checking buckets:", bucketsError);
      return new Response(
        JSON.stringify({ error: "Failed to check storage buckets", details: bucketsError }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const hasUserContentBucket = buckets.some((bucket) => bucket.name === "user-content");
    
    if (!hasUserContentBucket) {
      // Create the user-content bucket
      const { data: newBucket, error: createError } = await supabaseClient.storage.createBucket(
        "user-content",
        { 
          public: false,
          fileSizeLimit: 52428800 // 50MB
        }
      );
      
      if (createError) {
        console.error("Failed to create bucket:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create storage bucket", details: createError }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      console.log("Created user-content bucket:", newBucket);
      
      // Set up RLS policies for the bucket
      try {
        // Policy for users to read their own files
        await supabaseClient.storage.from('user-content').createPolicy(
          'Read access for authenticated users',
          {
            name: 'read_own_files',
            definition: {
              download: {
                expression: 'owner = auth.uid()'
              }
            }
          }
        );
        
        // Policy for users to upload their own files
        await supabaseClient.storage.from('user-content').createPolicy(
          'Upload access for authenticated users',
          {
            name: 'upload_own_files',
            definition: {
              insert: {
                expression: 'owner = auth.uid()'
              }
            }
          }
        );
        
        // Policy for users to update their own files
        await supabaseClient.storage.from('user-content').createPolicy(
          'Update access for authenticated users',
          {
            name: 'update_own_files',
            definition: {
              update: {
                expression: 'owner = auth.uid()'
              }
            }
          }
        );
        
        // Policy for users to delete their own files
        await supabaseClient.storage.from('user-content').createPolicy(
          'Delete access for authenticated users',
          {
            name: 'delete_own_files',
            definition: {
              delete: {
                expression: 'owner = auth.uid()'
              }
            }
          }
        );
        
        console.log("Set up storage policies successfully");
      } catch (policyError) {
        console.error("Error setting up storage policies:", policyError);
        // Continue anyway - the bucket is created, policies can be set up later
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: hasUserContentBucket ? "Storage bucket already exists" : "Storage bucket created successfully",
        bucket: "user-content" 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
