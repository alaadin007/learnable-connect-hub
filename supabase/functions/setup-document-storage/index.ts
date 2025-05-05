
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
    
    // Check if the user-content bucket exists first before trying to create it
    const { data: bucketInfo, error: bucketError } = await supabaseClient.storage.getBucket('user-content');
    
    // If bucket doesn't exist, create it
    if (bucketError && bucketError.message && bucketError.message.includes('does not exist')) {
      console.log("user-content bucket does not exist, creating...");
      
      // Create the user-content bucket
      const { data: newBucket, error: createError } = await supabaseClient.storage.createBucket(
        "user-content",
        { 
          public: true, // Make bucket public for easier access
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
        await supabaseClient.rpc('create_storage_policy', {
          bucket_name: 'user-content',
          policy_name: 'read_own_files',
          definition: {
            download: {
              expression: 'storage.foldername(name) = auth.uid()::text' 
            }
          }
        });
        
        // Policy for users to upload their own files
        await supabaseClient.rpc('create_storage_policy', {
          bucket_name: 'user-content',
          policy_name: 'upload_own_files',
          definition: {
            insert: {
              expression: 'storage.foldername(name) = auth.uid()::text'
            }
          }
        });
        
        // Policy for users to update their own files
        await supabaseClient.rpc('create_storage_policy', {
          bucket_name: 'user-content',
          policy_name: 'update_own_files',
          definition: {
            update: {
              expression: 'storage.foldername(name) = auth.uid()::text'
            }
          }
        });
        
        // Policy for users to delete their own files
        await supabaseClient.rpc('create_storage_policy', {
          bucket_name: 'user-content',
          policy_name: 'delete_own_files',
          definition: {
            delete: {
              expression: 'storage.foldername(name) = auth.uid()::text'
            }
          }
        });
        
        console.log("Set up storage policies successfully");
      } catch (policyError) {
        console.error("Error setting up storage policies:", policyError);
        // Continue anyway - the bucket is created, policies can be set up later
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Storage bucket created successfully",
          bucket: "user-content" 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } else if (bucketError) {
      // Some other error occurred when checking for the bucket
      console.error("Error checking bucket:", bucketError);
      return new Response(
        JSON.stringify({ error: "Failed to check storage bucket", details: bucketError }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Bucket already exists
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Storage bucket already exists",
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
