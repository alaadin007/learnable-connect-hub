
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
    console.log("Starting setup-document-storage function");
    
    // Create Supabase client with admin privileges
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Check if the user-content bucket exists
    let { data: bucketInfo, error: bucketError } = await supabaseClient.storage.getBucket('user-content');
    
    // If bucket doesn't exist, create it
    if (bucketError && bucketError.message.includes('does not exist')) {
      console.log("Creating user-content bucket...");
      
      // Create the user-content bucket (making it public)
      const { data: newBucket, error: createError } = await supabaseClient.storage.createBucket(
        "user-content",
        { 
          public: true, 
          fileSizeLimit: 52428800 // 50MB
        }
      );
      
      if (createError) {
        console.error("Error creating bucket:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create storage bucket", details: createError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Created user-content bucket successfully");
      bucketInfo = newBucket;

      try {
        // Setup simple public access policy - everyone can download
        await supabaseClient.query(`
          CREATE POLICY "Allow public read access" 
          ON storage.objects 
          FOR SELECT 
          USING (bucket_id = 'user-content');
        `);

        // Policy for authenticated users to upload
        await supabaseClient.query(`
          CREATE POLICY "Allow authenticated users to upload" 
          ON storage.objects 
          FOR INSERT 
          TO authenticated 
          WITH CHECK (bucket_id = 'user-content');
        `);

        // Policy for users to update their own files
        await supabaseClient.query(`
          CREATE POLICY "Allow users to update own files" 
          ON storage.objects 
          FOR UPDATE 
          TO authenticated 
          USING (bucket_id = 'user-content' AND owner = auth.uid());
        `);

        // Policy for users to delete their own files
        await supabaseClient.query(`
          CREATE POLICY "Allow users to delete own files" 
          ON storage.objects 
          FOR DELETE 
          TO authenticated 
          USING (bucket_id = 'user-content' AND owner = auth.uid());
        `);
        
        console.log("Storage policies created successfully");
      } catch (policyError) {
        console.error("Error creating storage policies:", policyError);
        // Continue anyway - the bucket is created
      }
    } else if (bucketError) {
      console.error("Error checking bucket:", bucketError);
      return new Response(
        JSON.stringify({ error: "Failed to check storage bucket", details: bucketError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.log("user-content bucket already exists");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: bucketInfo ? "Storage bucket ready" : "Storage bucket already exists",
        bucket: "user-content" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
